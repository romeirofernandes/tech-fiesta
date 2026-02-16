import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, AlertTriangle } from 'lucide-react';
import { useUser } from '../context/UserContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAdmin } = useUser();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Sign in with Firebase (Firebase validates the password)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if this email is the admin email from .env
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      
      if (user.email === adminEmail) {
        // User is admin
        setIsAdmin(true);
        toast.success("Admin login successful!");
        navigate('/admin');
      } else {
        // Not an admin - sign them out immediately
        await auth.signOut();
        toast.error("Access denied. You are not authorized as an admin.");
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error("Invalid email or password");
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("Too many failed attempts. Please try again later.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Secure access for administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
        
          
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input 
                id="admin-email" 
                type="email" 
                placeholder="admin@pashu.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input 
                id="admin-password" 
                type="password" 
                value={password} 
                placeholder="••••••••" 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Login as Admin"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Back to Home
            </Link>
            {" • "}
            <Link to="/login" className="text-primary hover:underline">
              User Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLogin;