// src/pages/Admin/AdminLayout.jsx
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  ShirtIcon, LogOut, UserCog, Truck, Home,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { logout } from '../../store/slices/authSlice';
import './Admin.css';

const NAV = [
  { to:'/admin',           icon:<LayoutDashboard size={15}/>, label:'Dashboard',     end:true },
  { to:'/admin/products',  icon:<Package         size={15}/>, label:'Products'             },
  { to:'/admin/orders',    icon:<ShoppingBag     size={15}/>, label:'Orders'               },
  { to:'/admin/drivers',   icon:<Truck           size={15}/>, label:'Drivers & Map'        },
  { to:'/admin/users',     icon:<UserCog         size={15}/>, label:'Users & Admins'       },
  { to:'/admin/customers', icon:<Users           size={15}/>, label:'Customers'            },
  { to:'/admin/coupons',   icon:<Tag             size={15}/>, label:'Coupons'              },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`admin-layout ${mobileOpen ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <button className="admin-sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-icon"><ShirtIcon size={14}/></div>
          <span>ShirtCraft</span>
          <span className="admin-sidebar__badge">Admin</span>
        </div>

        <nav className="admin-sidebar__nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`}>
              {n.icon} {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__bottom">
          <Link to="/" className="admin-sidebar__link" style={{ opacity:0.55 }}>
            <Home size={15}/> Back to Site
          </Link>
        </div>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__avatar">{user?.name?.[0] || 'A'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <p className="admin-sidebar__user-name">{user?.name || 'Admin'}</p>
            <p className="admin-sidebar__user-role">Administrator</p>
          </div>
          <button className="admin-sidebar__logout"
            onClick={() => dispatch(logout())} title="Sign Out">
            <LogOut size={13}/>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main__mobile-header">
          <button className="admin-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <select className="admin-mobile-select" value={location.pathname} onChange={(e) => { navigate(e.target.value); setMobileOpen(false); }} aria-label="Navigate admin">
            <option value="">Navigate</option>
            {NAV.map(n => (
              <option key={n.to} value={n.to}>{n.label}</option>
            ))}
          </select>
        </div>

        <Outlet/>
      </main>

      {mobileOpen && <div className="admin-backdrop" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
