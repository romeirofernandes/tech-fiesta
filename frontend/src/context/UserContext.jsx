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
  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem('isAdmin');
    return saved === 'true';
  });
  const [isBusinessMode, setIsBusinessMode] = useState(() => {
    const saved = localStorage.getItem('isBusinessMode');
    return saved === 'true';
  });
  const [businessProfile, setBusinessProfile] = useState(() => {
    const saved = localStorage.getItem('businessProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [bizOwner, setBizOwner] = useState(() => {
    const saved = localStorage.getItem('bizOwner');
    return saved ? JSON.parse(saved) : null;
  });

  // Save mongoUser to localStorage whenever it changes
  useEffect(() => {
    if (mongoUser) {
      localStorage.setItem('mongoUser', JSON.stringify(mongoUser));
    } else {
      localStorage.removeItem('mongoUser');
    }
  }, [mongoUser]);

  // Save isAdmin to localStorage whenever it changes
  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('isAdmin', 'true');
    } else {
      localStorage.removeItem('isAdmin');
    }
  }, [isAdmin]);

  // Save business mode to localStorage
  useEffect(() => {
    if (isBusinessMode) {
      localStorage.setItem('isBusinessMode', 'true');
    } else {
      localStorage.removeItem('isBusinessMode');
    }
  }, [isBusinessMode]);

  // Save business profile to localStorage
  useEffect(() => {
    if (businessProfile) {
      localStorage.setItem('businessProfile', JSON.stringify(businessProfile));
    } else {
      localStorage.removeItem('businessProfile');
    }
  }, [businessProfile]);

  // Save bizOwner to localStorage
  useEffect(() => {
    if (bizOwner) {
      localStorage.setItem('bizOwner', JSON.stringify(bizOwner));
    } else {
      localStorage.removeItem('bizOwner');
    }
  }, [bizOwner]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed. Firebase User:", firebaseUser ? "Yes" : "No");

      if (firebaseUser) {
        setUser(firebaseUser);

        // Check if this user is admin
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        if (firebaseUser.email === adminEmail) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        // If we have a firebase user but no mongoUser, try to fetch it from backend
        // This handles page refreshes where localStorage might be cleared or sync was incomplete
        if (!mongoUser && !isAdmin) {
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
        setIsAdmin(false);
        localStorage.removeItem('mongoUser');
        localStorage.removeItem('isAdmin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mongoUser, isAdmin]);

  useEffect(() => {
    console.log("User Context State Changed:", { user, mongoUser, isAdmin });
  }, [user, mongoUser, isAdmin]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMongoUser(null);
      setIsAdmin(false);
      setIsBusinessMode(false);
      setBusinessProfile(null);
      setBizOwner(null);
      localStorage.removeItem('bizToken');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const bizLogout = () => {
    setBizOwner(null);
    localStorage.removeItem('bizToken');
    localStorage.removeItem('bizOwner');
  };

  return (
    <UserContext.Provider value={{ user, mongoUser, setMongoUser, isAdmin, setIsAdmin, isBusinessMode, setIsBusinessMode, businessProfile, setBusinessProfile, bizOwner, setBizOwner, bizLogout, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};