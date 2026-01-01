import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import VaccinationSchedules from './pages/VaccinationSchedules';
import VacxDetail from './pages/VacxDetail';
import NotFound from './pages/NotFound';
import { useUser } from './context/UserContext';
import Loading from './components/ui/Loading';
import Animals from './pages/Animals';
import AnimalDetail from './pages/AnimalDetail';
import CreateAnimal from './pages/CreateAnimal';
import EditAnimal from './pages/EditAnimal';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) return <Loading />;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) return <Loading />;
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route 
          path="/vaccination-schedules" 
          element={
            <ProtectedRoute>
              <VaccinationSchedules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vacxx/:id" 
          element={
            <ProtectedRoute>
              <VacxDetail />
            </ProtectedRoute>
          } 
        />
        <Route path="/animals" element={
          <ProtectedRoute>
            <Animals />
          </ProtectedRoute>
        } />
        <Route path="/animals/create" element={
          <ProtectedRoute>
            <CreateAnimal />
          </ProtectedRoute>
        } />
        <Route path="/animals/:id" element={
          <ProtectedRoute>
            <AnimalDetail />
          </ProtectedRoute>
        } />
        <Route path="/animals/:id/edit" element={
          <ProtectedRoute>
            <EditAnimal />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;