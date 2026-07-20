// src/components/Layout/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, User, Menu, X, ShirtIcon, ChevronDown, LogOut, Shield } from 'lucide-react';
import { openCart, selectCartCount } from '../../store/slices/cartSlice';
import { logout } from '../../store/slices/authSlice';
import { selectWishlistItems } from '../../store/slices/wishlistSlice';
import ThemeToggle from '../UI/ThemeToggle';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Shop',          href: '/catalog' },
  { label: 'Design Studio', href: '/design-studio', highlight: true }
];

export default function Navbar() {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const cartCount    = useSelector(selectCartCount);
  const wishlist     = useSelector(selectWishlistItems);
  const { user, isLoggedIn } = useSelector(s => s.auth);

  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isStudio = pathname.startsWith('/design-studio');
  const isDriverArea = pathname.startsWith('/driver');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  if (isStudio || isDriverArea) return null;

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon"><ShirtIcon size={18} /></span>
          ShirtCraft
        </Link>

        <nav className="navbar__nav hide-mobile">
          {NAV_LINKS.map(link => (
            <Link key={link.href} to={link.href}
              className={`navbar__link ${link.highlight ? 'navbar__link--highlight' : ''} ${pathname === link.href ? 'navbar__link--active' : ''}`}>
              {link.highlight && <ShirtIcon size={13} />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar__actions">
          <ThemeToggle />

          <Link to="/dashboard/wishlist" className="navbar__icon-btn" aria-label="Wishlist">
            <Heart size={19} />
            {wishlist.length > 0 && <span className="navbar__badge">{wishlist.length}</span>}
          </Link>

          <button className="navbar__icon-btn" onClick={() => dispatch(openCart())} aria-label="Cart">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="navbar__badge navbar__badge--accent">{cartCount}</span>}
          </button>

          {isLoggedIn ? (
            <div className="navbar__user" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <div className="navbar__avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <ChevronDown size={13} className={`navbar__chevron ${userMenuOpen ? 'rotate' : ''}`} />
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div className="navbar__dropdown"
                    initial={{ opacity:0, y:8, scale:0.96 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:8, scale:0.96 }}
                    transition={{ duration:0.15 }}>
                    <div className="navbar__dropdown-header">
                      <p className="navbar__dropdown-name">{user?.name}</p>
                      <p className="navbar__dropdown-email">{user?.email}</p>
                      {user?.role === 'admin' && (
                        <span className="navbar__dropdown-role"><Shield size={10} /> Admin</span>
                      )}
                    </div>
                    <Link to="/dashboard"          className="navbar__dropdown-item">My Orders</Link>
                    <Link to="/dashboard/wishlist"  className="navbar__dropdown-item">Wishlist</Link>
                    <Link to="/dashboard/profile"   className="navbar__dropdown-item">Profile</Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className="navbar__dropdown-item navbar__dropdown-item--admin">
                        <Shield size={13} /> Admin Panel
                      </Link>
                    )}
                    <div className="navbar__dropdown-divider" />
                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm hide-mobile">
              <User size={13} /> Sign In
            </Link>
          )}

          <button className="navbar__hamburger hide-desktop" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="navbar__mobile"
            initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} to={link.href} className="navbar__mobile-link">{link.label}</Link>
            ))}
            {!isLoggedIn ? (
              <>
                <Link to="/login"    className="navbar__mobile-link">Sign In</Link>
                <Link to="/register" className="navbar__mobile-link navbar__mobile-link--accent">Create Account</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="navbar__mobile-link">My Orders</Link>
                {user?.role === 'admin' && <Link to="/admin" className="navbar__mobile-link">Admin Panel</Link>}
                <button className="navbar__mobile-link navbar__mobile-link--danger" style={{width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',color:'var(--color-error)',fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:500,padding:'var(--space-4) var(--space-6)'}} onClick={handleLogout}>Sign Out</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
