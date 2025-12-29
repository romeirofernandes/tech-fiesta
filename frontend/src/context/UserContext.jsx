import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mongoUser, setMongoUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase User:", firebaseUser);
        setUser(firebaseUser);
      } else {
        console.log("User signed out");
        setUser(null);
        setMongoUser(null);
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
