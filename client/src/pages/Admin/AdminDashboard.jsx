// src/pages/Admin/AdminDashboard.jsx — 100% live API data
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, ShoppingBag, Users, TrendingUp, ArrowUpRight, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';

const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444'];
const ORDER_STATUSES = ['delivered','shipped','processing','pending'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p style={{ fontWeight:700, marginBottom:4 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color: p.color, opacity:0.9 }}>
          {p.name}: {p.name.includes('Revenue') || p.name === 'amount'
            ? `₦${Number(p.value).toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  );
};

function StatSkeleton() {
  return (
    <div className="admin-stat-card">
      <div className="skeleton" style={{ width:44, height:44, borderRadius:'var(--radius-md)', flexShrink:0 }}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <div className="skeleton" style={{ height:12, width:'60%' }}/>
        <div className="skeleton" style={{ height:28, width:'80%' }}/>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const [stats,       setStats]       = useState(null);
  const [revenue,     setRevenue]     = useState([]);
  const [recentOrders,setRecentOrders]= useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = async () => {
  setIsLoading(true);
  try {
    // Fetch stats
    const statsRes = await api.get('/admin/stats');
    setStats(statsRes.data);

    // Fetch revenue data
    const revenueRes = await api.get('/admin/revenue');
    setRevenue(revenueRes.data);

    // Fetch recent orders
    const ordersRes = await api.get('/orders?limit=8&page=1');
    const orders = ordersRes.data.orders || ordersRes.data;
    setRecentOrders(Array.isArray(orders) ? orders.slice(0,8) : []);

    // Build status breakdown from orders
    if (Array.isArray(orders) && orders.length > 0) {
      const counts = {};
      ORDER_STATUSES.forEach(s => { counts[s] = 0; });
      orders.forEach(o => { 
        if (counts[o.status] !== undefined) counts[o.status]++; 
      });
      setStatusBreakdown(ORDER_STATUSES.map(s => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        value: counts[s],
      })).filter(d => d.value > 0));
    }

    setLastRefresh(new Date());
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    dispatch(showToast({ message: 'Failed to load dashboard data', type: 'error' }));
  } finally {
    setIsLoading(false);
  }
};

  // const fetchAll = async () => {
  //   setIsLoading(true);
  //   try {
  //     const [statsRes, revenueRes, ordersRes] = await Promise.all([
  //       api.get('/admin/stats'),
  //       api.get('/admin/revenue'),
  //       api.get('/orders?limit=8&page=1'),
  //     ]);

  //     setStats(statsRes.data);
  //     setRevenue(revenueRes.data);

  //     const orders = ordersRes.data.orders || ordersRes.data;
  //     setRecentOrders(Array.isArray(orders) ? orders.slice(0,8) : []);

  //     // Build status breakdown from recent orders
  //     if (Array.isArray(orders) && orders.length > 0) {
  //       const counts = {};
  //       ORDER_STATUSES.forEach(s => { counts[s] = 0; });
  //       orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  //       setStatusBreakdown(ORDER_STATUSES.map(s => ({
  //         name: s.charAt(0).toUpperCase() + s.slice(1),
  //         value: counts[s],
  //       })).filter(d => d.value > 0));
  //     }

  //     setLastRefresh(new Date());
  //   } catch (err) {
  //     console.error('Dashboard fetch error:', err);
  //     dispatch(showToast({ message: 'Failed to load dashboard data', type: 'error' }));
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  useEffect(() => { fetchAll(); }, []);

  const STAT_CARDS = stats ? [
    { label:'Total Revenue',    value:`₦${(stats.totalRevenue||0).toLocaleString()}`, icon:<DollarSign size={20}/>, color:'#FF4F1F' },
    { label:'Total Orders',     value:(stats.totalOrders||0).toLocaleString(),         icon:<ShoppingBag size={20}/>, color:'#0D0D0D' },
    { label:'Customers',        value:(stats.totalCustomers||0).toLocaleString(),       icon:<Users size={20}/>,      color:'#10B981' },
    { label:'Avg. Order Value', value:`₦${stats.totalOrders > 0 ? Math.round((stats.totalRevenue||0)/(stats.totalOrders||1)).toLocaleString() : '0'}`, icon:<TrendingUp size={20}/>, color:'#7C3AED' },
  ] : [];

  const statusColors = { Delivered:'#10B981', Shipped:'#3B82F6', Processing:'#F59E0B', Pending:'#6B7280', Cancelled:'#EF4444' };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Dashboard</h1>
            <p className="admin-page__subtitle">
              Live performance data · Last updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchAll} disabled={isLoading}>
            <RefreshCw size={13} style={{ animation: isLoading?'spin 1s linear infinite':undefined }}/> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="admin-stats-grid">
        {isLoading ? (
          [1,2,3,4].map(i => <StatSkeleton key={i}/>)
        ) : (
          STAT_CARDS.map((s,i) => (
            <div key={s.label} className="admin-stat-card">
              <div className="admin-stat-card__icon" style={{ background:`${s.color}18`, color:s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="admin-stat-card__label">{s.label}</p>
                <p className="admin-stat-card__value">{s.value}</p>
              </div>
              <div className="admin-stat-card__change">
                <ArrowUpRight size={11}/> Live
              </div>
            </div>
          ))
        )}
      </div>

      {/* Charts */}
      <div className="admin-charts-grid">
        {/* Revenue */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Revenue (Last 6 Months)</h3>
            {revenue.length > 0 && (
              <span className="badge badge-success">
                ₦{revenue.reduce((s,d)=>s+d.amount,0).toLocaleString()} total
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height:240 }}/>
          ) : revenue.length === 0 ? (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontFamily:'var(--font-display)', fontSize:'0.875rem' }}>
              No revenue data yet. Orders will appear here once paid.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF4F1F" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#FF4F1F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
                <XAxis dataKey="month" tick={{ fontSize:11, fontFamily:'var(--font-display)', fill:'var(--text-muted)' }}/>
                <YAxis tick={{ fontSize:10, fontFamily:'var(--font-mono)', fill:'var(--text-muted)' }} tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="amount" stroke="#FF4F1F" strokeWidth={2.5} fill="url(#revGrad)" name="Revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by month */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Orders per Month</h3>
            {revenue.length > 0 && (
              <span className="badge badge-accent">
                {revenue.reduce((s,d)=>s+(d.orders||0),0)} total
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height:240 }}/>
          ) : revenue.length === 0 ? (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontFamily:'var(--font-display)', fontSize:'0.875rem' }}>
              No order data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
                <XAxis dataKey="month" tick={{ fontSize:11, fontFamily:'var(--font-display)', fill:'var(--text-muted)' }}/>
                <YAxis tick={{ fontSize:10, fontFamily:'var(--font-mono)', fill:'var(--text-muted)' }}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="orders" fill="var(--text-primary)" radius={[4,4,0,0]} name="Orders"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="admin-bottom-grid">
        {/* Top products */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header"><h3>Top Products by Revenue</h3></div>
          {isLoading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:48 }}/>)}
            </div>
          ) : !stats?.topProducts?.length ? (
            <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', padding:'var(--space-6) 0' }}>No sales data yet.</p>
          ) : (
            <div className="admin-top-products">
              {stats.topProducts.map((p,i) => (
                <div key={p._id} className="admin-top-product">
                  <span className="admin-top-product__rank">{String(i+1).padStart(2,'0')}</span>
                  <div className="admin-top-product__info">
                    <p className="admin-top-product__name">{p._id}</p>
                    <p className="admin-top-product__sales">{p.sales} units sold</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p className="admin-top-product__rev">₦{(p.revenue||0).toLocaleString()}</p>
                    <div style={{ height:3, width:80, background:'var(--border-color)', borderRadius:2, marginTop:4 }}>
                      <div style={{ height:'100%', background:'var(--color-accent)', borderRadius:2, width:`${Math.round((p.revenue/(stats.topProducts[0]?.revenue||1))*100)}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status donut */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header"><h3>Order Status Breakdown</h3></div>
          {isLoading ? (
            <div className="skeleton" style={{ height:200 }}/>
          ) : statusBreakdown.length === 0 ? (
            <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.875rem' }}>
              No orders yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusBreakdown.map((d,i) => (
                    <Cell key={i} fill={statusColors[d.name] || COLORS[i % COLORS.length]}/>
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontFamily:'var(--font-display)', fontSize:11, color:'var(--text-secondary)' }}/>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent orders — live */}
        <div className="admin-chart-card" style={{ gridColumn:'span 2' }}>
          <div className="admin-chart-card__header">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="admin-chart-card__link" style={{ display:'flex', alignItems:'center', gap:4 }}>
              View all <ExternalLink size={12}/>
            </Link>
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height:200 }}/>
          ) : recentOrders.length === 0 ? (
            <div style={{ padding:'var(--space-8)', textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem' }}>
              No orders have been placed yet.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o._id}>
                      <td className="admin-table__id">{o.orderNumber}</td>
                      <td style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize:'0.8125rem' }}>{o.user?.name || '—'}</td>
                      <td style={{ fontSize:'0.8125rem' }}>{o.items?.reduce((s,i)=>s+i.quantity,0)||0} pcs</td>
                      <td><span className={`admin-status admin-status--${o.status}`}>{o.status}</span></td>
                      <td className="admin-table__total">₦{(o.total||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
