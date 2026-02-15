import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { useUser, UserProvider } from './context/UserContext';
import Animals from './pages/animals/Animals';
import AnimalDetail from './pages/animals/AnimalDetail';
import CreateAnimal from './pages/animals/CreateAnimal';
import EditAnimal from './pages/animals/EditAnimal';
import Farms from './pages/farms/Farms';
import FarmDetail from './pages/farms/FarmDetail';
import CreateFarm from './pages/farms/CreateFarm';
import EditFarm from './pages/farms/EditFarm';
import LiveVitals from './pages/LiveVitals';
import VaccinationCalendar from './pages/VaccinationCalendar';
import AdminDashboard from './pages/admin/AdminDashboard';
import BiOverview from './pages/bi/BiOverview';
import ProductionTracking from './pages/bi/ProductionTracking';
import FinanceTracking from './pages/bi/FinanceTracking';
import MarketPrices from './pages/bi/MarketPrices';
import Alerts from './pages/Alerts';
import Schemes from './pages/Schemes';
import SchemeDetail from './pages/SchemeDetail';
import Marketplace from './pages/Marketplace';
import { Layout } from './components/Layout';
import MyOrders from './pages/MyOrders';
import MySales from './pages/MySales';
import AnimalIdentification from './pages/AnimalIdentification';
import FarmMonitoring from './pages/FarmMonitoring';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) return <Layout loading={true} />;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) return null;

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <UserProvider>
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
          <Route path="/farms" element={
            <ProtectedRoute>
              <Farms />
            </ProtectedRoute>
          } />
          <Route path="/farms/create" element={
            <ProtectedRoute>
              <CreateFarm />
            </ProtectedRoute>
          } />
          <Route path="/farms/:id" element={
            <ProtectedRoute>
              <FarmDetail />
            </ProtectedRoute>
          } />
          <Route path="/farms/:id/edit" element={
            <ProtectedRoute>
              <EditFarm />
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <VaccinationCalendar />
            </ProtectedRoute>
          } />
          <Route path="/live-vitals" element={
            <ProtectedRoute>
              <LiveVitals />
            </ProtectedRoute>
          } />
          <Route path="/bi" element={
            <ProtectedRoute>
              <BiOverview />
            </ProtectedRoute>
          } />
          <Route path="/bi/production" element={
            <ProtectedRoute>
              <ProductionTracking />
            </ProtectedRoute>
          } />
          <Route path="/bi/finance" element={
            <ProtectedRoute>
              <FinanceTracking />
            </ProtectedRoute>
          } />
          <Route path="/bi/prices" element={
            <ProtectedRoute>
              <MarketPrices />
            </ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          } />
          <Route path="/schemes" element={
            <ProtectedRoute>
              <Schemes />
            </ProtectedRoute>
          } />
          <Route path="/schemes/:slug" element={
            <ProtectedRoute>
              <SchemeDetail />
            </ProtectedRoute>
          } />
          <Route path="/farm-monitoring" element={
            <ProtectedRoute>
              <FarmMonitoring />
            </ProtectedRoute>
          } />
          <Route path="/animal-identification" element={
            <ProtectedRoute>
              <AnimalIdentification />
            </ProtectedRoute>
          } />
          <Route path="/marketplace" element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          } />
          <Route path="/my-orders" element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          } />
          <Route path="/my-sales" element={
            <ProtectedRoute>
              <MySales />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard></AdminDashboard>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;