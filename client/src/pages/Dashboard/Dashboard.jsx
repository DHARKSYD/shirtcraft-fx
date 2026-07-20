// src/pages/Dashboard/Dashboard.jsx
import { NavLink, Outlet, Link } from 'react-router-dom';
import { ShoppingBag, Heart, User, ShirtIcon, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import './Dashboard.css';

const DASH_NAV = [
  { to: '/dashboard/orders',   icon: <ShoppingBag size={16} />, label: 'My Orders'  },
  { to: '/dashboard/wishlist', icon: <Heart       size={16} />, label: 'Wishlist'   },
  { to: '/dashboard/profile',  icon: <User        size={16} />, label: 'Profile'    },
];

export default function Dashboard() {
  const { user } = useSelector(s => s.auth);

  return (
    <div className="dashboard">
      {/* Breadcrumb */}
      <div className="container">
        <div className="dashboard-breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={12} />
          <span>My Account</span>
        </div>
      </div>

      <div className="container dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {/* Profile summary */}
          <div className="dashboard-sidebar__profile">
            <div className="dashboard-sidebar__avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="dashboard-sidebar__name">{user?.name || 'Customer'}</p>
              <p className="dashboard-sidebar__email">{user?.email}</p>
            </div>
          </div>

          <nav className="dashboard-sidebar__nav">
            {DASH_NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `dashboard-sidebar__link ${isActive ? 'dashboard-sidebar__link--active' : ''}`}
              >
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </nav>

          <Link to="/design-studio" className="dashboard-sidebar__cta">
            <ShirtIcon size={16} />
            Open Design Studio
          </Link>
        </aside>

        {/* Content */}
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
