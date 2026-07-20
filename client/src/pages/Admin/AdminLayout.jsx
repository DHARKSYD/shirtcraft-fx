// src/pages/Admin/AdminLayout.jsx
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  ShirtIcon, LogOut, UserCog, Truck, Home,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
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

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
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

      <main className="admin-main"><Outlet/></main>
    </div>
  );
}
