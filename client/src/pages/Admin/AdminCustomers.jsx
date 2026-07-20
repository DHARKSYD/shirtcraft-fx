// src/pages/Admin/AdminCustomers.jsx — real API
import { useState, useEffect } from 'react';
import { Search, RefreshCw, Download } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';

export default function AdminCustomers() {
  const dispatch = useDispatch();
  const [customers, setCustomers] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { role:'customer', search, page, limit:20 },
      });
      setCustomers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      dispatch(showToast({ message:'Failed to fetch customers', type:'error' }));
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search, page]);

  const exportCSV = () => {
    const rows = [
      ['Name','Email','Joined','Status'],
      ...customers.map(c => [
        c.name, c.email,
        new Date(c.createdAt).toLocaleDateString(),
        c.isActive ? 'Active' : 'Inactive',
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `shirtcraft-customers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(showToast({ message:'Customer data exported', type:'success' }));
  };

  const pages = Math.ceil(total / 20);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Customers</h1>
            <p className="admin-page__subtitle">{total} registered customers</p>
          </div>
          <div style={{ display:'flex', gap:'var(--space-2)' }}>
            <button className="btn btn-outline btn-sm" onClick={fetchCustomers}><RefreshCw size={13}/></button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={13}/> Export CSV</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:400 }}>
        <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input className="input-field" style={{ paddingLeft:'2.5rem', borderRadius:'var(--radius-full)' }}
          placeholder="Search by name or email…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
      </div>

      <div className="admin-chart-card">
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding:'var(--space-10)', textAlign:'center', color:'var(--text-muted)' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : customers.length === 0 ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>
              No customers found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Customer</th><th>Joined</th><th>Phone</th><th>Status</th></tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--color-accent)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{c.name}</p>
                          <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric' })}
                    </td>
                    <td style={{ fontSize:'0.8125rem', color:'var(--text-secondary)' }}>
                      {c.phone || <span style={{ color:'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`admin-status ${c.isActive ? 'admin-status--delivered' : 'admin-status--pending'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'var(--space-2)', padding:'var(--space-4)', borderTop:'1px solid var(--border-color)' }}>
            <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', alignSelf:'center', color:'var(--text-muted)' }}>{page} / {pages}</span>
            <button className="btn btn-outline btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
