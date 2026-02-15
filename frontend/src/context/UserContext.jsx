import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mongoUser, setMongoUser] = useState(() => {
    const saved = localStorage.getItem('mongoUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (mongoUser) {
      localStorage.setItem('mongoUser', JSON.stringify(mongoUser));
    } else {
      localStorage.removeItem('mongoUser');
    }
  }, [mongoUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed. Firebase User:", firebaseUser ? "Yes" : "No");

      if (firebaseUser) {
        setUser(firebaseUser);

        // If we have a firebase user but no mongoUser, try to fetch it from backend
        // This handles page refreshes where localStorage might be cleared or sync was incomplete
        if (!mongoUser) {
          const savedMongoUser = localStorage.getItem('mongoUser');
          if (savedMongoUser) {
            setMongoUser(JSON.parse(savedMongoUser));
          } else {
            // Potential sync if not on login/register page
            const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
            if (!isAuthPage) {
              try {
                console.log("Attempting to auto-sync missing Mongo user...");
                const base = import.meta.env.VITE_API_BASE_URL;
                const response = await fetch(`${base}/api/farmers/auth`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ firebaseUid: firebaseUser.uid }),
                });
                if (response.ok) {
                  const data = await response.json();
                  setMongoUser(data);
                }
              } catch (err) {
                console.error("Auto-sync failed:", err);
              }
            }
          }
        }
      } else {
        setUser(null);
        setMongoUser(null);
        localStorage.removeItem('mongoUser');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mongoUser]);

  useEffect(() => {
    console.log("User Context State Changed:", { user, mongoUser });
  }, [user, mongoUser]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMongoUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, mongoUser, setMongoUser, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};
