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
      if (firebaseUser) {
        console.log("Firebase User:", firebaseUser);
        setUser(firebaseUser);
        
        // Check if mongoUser is missing when firebase user is present
        const savedMongoUser = localStorage.getItem('mongoUser');
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

        if (!savedMongoUser && !mongoUser && !isAuthPage) {
             // Give it a small grace period or check if we are on a public route? 
             // Actually, if we are refreshing, mongoUser should be in localStorage.
             // If it's not, we should logout.
             console.warn("No Mongo User found for authenticated Firebase user. Logging out.");
             await signOut(auth);
             setUser(null);
             setMongoUser(null);
        }

      } else {
        console.log("User signed out");
        setUser(null);
        setMongoUser(null);
        localStorage.removeItem('mongoUser');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
