import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VaccinationSchedules from './pages/VaccinationSchedules';
import { useUser } from './context/UserContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vaccination-schedules" 
          element={
            <ProtectedRoute>
              <VaccinationSchedules />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;