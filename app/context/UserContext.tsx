import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface MongoUser {
  _id: string;
  firebaseUid: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  imageUrl?: string;
  createdAt?: string;
}

interface UserContextType {
  firebaseUser: FirebaseUser | null;
  mongoUser: MongoUser | null;
  loading: boolean;
  setMongoUser: (user: MongoUser | null) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [mongoUser, setMongoUserState] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        // Try to load user data from AsyncStorage
        try {
          const storedUser = await AsyncStorage.getItem('mongoUser');
          if (storedUser) {
            setMongoUserState(JSON.parse(storedUser));
          }
        } catch (error) {
          console.error('Error loading user from storage:', error);
        }
      } else {
        setMongoUserState(null);
        await AsyncStorage.removeItem('mongoUser');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setMongoUser = async (user: MongoUser | null) => {
    setMongoUserState(user);
    if (user) {
      try {
        await AsyncStorage.setItem('mongoUser', JSON.stringify(user));
      } catch (error) {
        console.error('Error saving user to storage:', error);
      }
    } else {
      await AsyncStorage.removeItem('mongoUser');
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('mongoUser');
      setMongoUserState(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ firebaseUser, mongoUser, loading, setMongoUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
