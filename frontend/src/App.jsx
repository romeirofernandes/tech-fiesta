// Update your App.js Routes section

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
import DeadAnimals from './pages/animals/DeadAnimals';
import Farms from './pages/farms/Farms';
import FarmDetail from './pages/farms/FarmDetail';
import CreateFarm from './pages/farms/CreateFarm';
import EditFarm from './pages/farms/EditFarm';
import LiveVitals from './pages/LiveVitals';
import Geofencing from './pages/Geofencing';
import HerdWatch from './pages/HerdWatch';
import VaccinationCalendar from './pages/VaccinationCalendar';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import BiOverview from './pages/bi/BiOverview';
import ProductionTracking from './pages/bi/ProductionTracking';
import FinanceTracking from './pages/bi/FinanceTracking';
import MarketPrices from './pages/bi/MarketPrices';
import VideoSummary from './pages/VideoSummary';
import Alerts from './pages/Alerts';
import Schemes from './pages/Schemes';
import SchemeDetail from './pages/SchemeDetail';
import Marketplace from './pages/Marketplace';
import { Layout } from './components/Layout';
import MyOrders from './pages/MyOrders';
import MySales from './pages/MySales';
import AnimalIdentification from './pages/AnimalIdentification';
import FarmMonitoring from './pages/FarmMonitoring';
import Emergency from './pages/Emergency';
import FakeHeartrate from './pages/FakeHeartrate';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import DiseaseDetector from './pages/DiseaseDetector';
import PublicAnimalProfile from './pages/animals/PublicAnimalProfile';
import FarmInsights from './pages/FarmInsights';
import AadhaarVerification from './pages/AadhaarVerification';

// Business pages
import BusinessDashboard from './pages/business/BusinessDashboard';
import GSTVerification from './pages/business/GSTVerification';
import BusinessMarketplace from './pages/business/BusinessMarketplace';
import BusinessOrders from './pages/business/BusinessOrders';
import BusinessSales from './pages/business/BusinessSales';
import BusinessReports from './pages/business/BusinessReports';

// Separate Business Owner pages (independent login)
import BizLogin from './pages/biz/BizLogin';
import BizRegister from './pages/biz/BizRegister';
import BizDashboard from './pages/biz/BizDashboard';
import WhatsAppPage from './pages/WhatsApp';
import Reports from './pages/Reports';

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

const BizProtectedRoute = ({ children }) => {
  const { bizOwner } = useUser();
  const token = localStorage.getItem('bizToken');

  if (!bizOwner || !token) {
    return <Navigate to="/biz/login" />;
  }

  return children;
};

const BizPublicRoute = ({ children }) => {
  const { bizOwner } = useUser();
  const token = localStorage.getItem('bizToken');

  if (bizOwner && token) {
    return <Navigate to="/biz/dashboard" />;
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

          {/* Public animal share page (no auth) */}
          <Route path="/animal/:id/share" element={<PublicAnimalProfile />} />

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes with nested routing */}
          <Route path="/admin/*" element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
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
          <Route path="/whatsapp" element={
            <ProtectedRoute>
              <WhatsAppPage />
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
          <Route path="/animals/dead" element={
            <ProtectedRoute>
              <DeadAnimals />
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
          <Route path="/geofencing" element={
            <ProtectedRoute>
              <Geofencing />
            </ProtectedRoute>
          } />
          <Route path="/herd-watch" element={
            <ProtectedRoute>
              <HerdWatch />
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
          <Route path="/video-summary" element={
            <ProtectedRoute>
              <VideoSummary />
            </ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          } />
          <Route path="/disease-detector" element={
            <ProtectedRoute>
              <DiseaseDetector />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/insights" element={
            <ProtectedRoute>
              <FarmInsights />
            </ProtectedRoute>
          } />
          <Route path="/emergency" element={
            <ProtectedRoute>
              <Emergency />
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
          <Route path="/aadhaar-verify" element={
            <ProtectedRoute>
              <AadhaarVerification />
            </ProtectedRoute>
          } />

          {/* Business Routes */}
          <Route path="/business" element={
            <ProtectedRoute>
              <BusinessDashboard />
            </ProtectedRoute>
          } />
          <Route path="/business/verify" element={
            <ProtectedRoute>
              <AadhaarVerification />
            </ProtectedRoute>
          } />
          <Route path="/business/marketplace" element={
            <ProtectedRoute>
              <BusinessMarketplace />
            </ProtectedRoute>
          } />
          <Route path="/business/orders" element={
            <ProtectedRoute>
              <BusinessOrders />
            </ProtectedRoute>
          } />
          <Route path="/business/sales" element={
            <ProtectedRoute>
              <BusinessSales />
            </ProtectedRoute>
          } />
          <Route path="/business/reports" element={
            <ProtectedRoute>
              <BusinessReports />
            </ProtectedRoute>
          } />
          <Route path="/business/reports/finance" element={
            <ProtectedRoute>
              <FinanceTracking />
            </ProtectedRoute>
          } />
          <Route path="/business/reports/prices" element={
            <ProtectedRoute>
              <MarketPrices />
            </ProtectedRoute>
          } />

          {/* Separate Business Owner Routes (independent auth) */}
          <Route path="/biz/login" element={
            <BizPublicRoute>
              <BizLogin />
            </BizPublicRoute>
          } />
          <Route path="/biz/register" element={
            <BizPublicRoute>
              <BizRegister />
            </BizPublicRoute>
          } />
          <Route path="/biz/dashboard" element={
            <BizProtectedRoute>
              <BizDashboard />
            </BizProtectedRoute>
          } />
          <Route path="/biz/marketplace" element={
            <BizProtectedRoute>
              <BusinessMarketplace />
            </BizProtectedRoute>
          } />
          <Route path="/biz/orders" element={
            <BizProtectedRoute>
              <BusinessOrders />
            </BizProtectedRoute>
          } />
          <Route path="/biz/sales" element={
            <BizProtectedRoute>
              <BusinessSales />
            </BizProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />

          {/* Hidden fake heartrate console */}
          <Route path="/fake-hr" element={<FakeHeartrate />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;