// src/App.jsx — v4 with Google OAuth, Driver system, Live Tracking
import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice';
import { BrowserRouter } from 'react-router-dom';

// Layout
import Navbar         from './components/Layout/Navbar';
import Footer         from './components/Layout/Footer';
import CartDrawer     from './components/Cart/CartDrawer';
import Toast          from './components/UI/Toast';
import ProtectedRoute from './components/UI/ProtectedRoute';

// Pages — public
import Home           from './pages/Home';
import InfoPage       from './pages/InfoPage';
import Catalog        from './pages/Catalog';
import ProductDetail  from './pages/ProductDetail';
import DesignStudio   from './pages/DesignStudio';
import Cart           from './pages/Cart';
import NotFound       from './pages/NotFound';
import TrackOrder     from './pages/TrackOrder';

// Auth
import Login          from './pages/Auth/Login';
import Register       from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword  from './pages/Auth/ResetPassword';
import OAuthCallback  from './pages/Auth/OAuthCallback';

// Customer dashboard
import Checkout       from './pages/Checkout';
import OrderSuccess   from './pages/OrderSuccess';
import Dashboard      from './pages/Dashboard/Dashboard';
import Orders         from './pages/Dashboard/Orders';
import Wishlist       from './pages/Dashboard/Wishlist';
import Profile        from './pages/Dashboard/Profile';

// Admin
import AdminLayout    from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProducts  from './pages/Admin/AdminProducts';
import AdminOrders    from './pages/Admin/AdminOrders';
import AdminDrivers   from './pages/Admin/AdminDrivers';
import AdminUsers     from './pages/Admin/AdminUsers';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminCoupons   from './pages/Admin/AdminCoupons';

// Driver
import DriverRegister  from './pages/Driver/DriverRegister';
import DriverLogin     from './pages/Driver/DriverLogin';
import DriverDashboard from './pages/Driver/DriverDashboard';
import DriverProfile   from './pages/Driver/DriverProfile';

import './styles/global.css';

// Pages where we suppress the main nav/footer
const NO_FOOTER    = ['/checkout', '/design-studio', '/driver'];
const FULL_SCREEN  = ['/design-studio', '/driver'];

export default function App() {
  const dispatch     = useDispatch();
  const { pathname } = useLocation();
  const { token }    = useSelector(s => s.auth);

  // Hydrate auth state from stored JWT on first load
  useEffect(() => { if (token) dispatch(fetchMe()); }, []);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  const hideFooter   = NO_FOOTER.some(p  => pathname.startsWith(p));
  const isFullScreen = FULL_SCREEN.some(p => pathname.startsWith(p));

  return (
    <>
      <Navbar/>
      <CartDrawer/>
      <Toast/>

      <main style={{ minHeight:'100vh', paddingTop: isFullScreen ? 0 : 'var(--navbar-height)' }}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"               element={<Home/>}/>
          <Route path="/catalog"        element={<Catalog/>}/>
          <Route path="/info"           element={<InfoPage/>}/>
          <Route path="/products/:id"   element={<ProductDetail/>}/>
          <Route path="/design-studio"  element={<DesignStudio/>}/>
          <Route path="/cart"           element={<Cart/>}/>
          <Route path="/track/:id"      element={<TrackOrder/>}/>

          {/* ── Auth ── */}
          <Route path="/login"           element={<Login/>}/>
          <Route path="/register"        element={<Register/>}/>
          <Route path="/forgot-password" element={<ForgotPassword/>}/>
          <Route path="/reset-password/:token" element={<ResetPassword/>}/>
          <Route path="/auth/callback"   element={<OAuthCallback/>}/>

          {/* ── Driver (public registration, own login/dashboard) ── */}
          <Route path="/driver/register"  element={<DriverRegister/>}/>
          <Route path="/driver/login"     element={<DriverLogin/>}/>
          <Route path="/driver/dashboard" element={<DriverDashboard/>}/>
          <Route path="/driver/profile"   element={<DriverProfile/>}/>

          {/* ── Protected: Customer ── */}
          <Route path="/checkout"
            element={<ProtectedRoute><Checkout/></ProtectedRoute>}/>
          <Route path="/order-success/:id"
            element={<ProtectedRoute><OrderSuccess/></ProtectedRoute>}/>

          <Route path="/dashboard"
            element={<ProtectedRoute><Dashboard/></ProtectedRoute>}>
            <Route index          element={<Orders/>}/>
            <Route path="orders"  element={<Orders/>}/>
            <Route path="wishlist"element={<Wishlist/>}/>
            <Route path="profile" element={<Profile/>}/>
          </Route>

          {/* ── Protected: Admin ── */}
          <Route path="/admin"
            element={<ProtectedRoute adminOnly><AdminLayout/></ProtectedRoute>}>
            <Route index              element={<AdminDashboard/>}/>
            <Route path="products"    element={<AdminProducts/>}/>
            <Route path="orders"      element={<AdminOrders/>}/>
            <Route path="drivers"     element={<AdminDrivers/>}/>
            <Route path="users"       element={<AdminUsers/>}/>
            <Route path="customers"   element={<AdminCustomers/>}/>
            <Route path="coupons"     element={<AdminCoupons/>}/>
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </main>

      {!hideFooter && <Footer/>}
    </>
  );
}
