// src/pages/Admin/AdminCoupons.jsx — real API
import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, RefreshCw, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';

const EMPTY = { code:'', discount:10, type:'percentage', usageLimit:100, expiresAt:'', minOrderValue:0 };

export default function AdminCoupons() {
  const dispatch = useDispatch();
  const [coupons,   setCoupons]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [creating,  setCreating]  = useState(false);
  const [deleteId,  setDeleteId]  = useState(null);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/coupons');
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      dispatch(showToast({ message:'Failed to load coupons', type:'error' }));
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const createCoupon = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount) return;
    setCreating(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        discount: Number(form.discount),
        usageLimit: Number(form.usageLimit) || null,
        minOrderValue: Number(form.minOrderValue) || 0,
        expiresAt: form.expiresAt || null,
      };
      const { data } = await api.post('/coupons', payload);
      setCoupons(cs => [data, ...cs]);
      setForm(EMPTY);
      setShowForm(false);
      dispatch(showToast({ message:`Coupon ${data.code} created!`, type:'success' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to create coupon', type:'error' }));
    } finally { setCreating(false); }
  };

  const toggleActive = async (id, current) => {
    try {
      const { data } = await api.put(`/coupons/${id}`, { isActive: !current });
      setCoupons(cs => cs.map(c => c._id===id ? data : c));
      dispatch(showToast({ message: !current ? 'Coupon activated' : 'Coupon deactivated', type:'success' }));
    } catch {
      dispatch(showToast({ message:'Update failed', type:'error' }));
    }
  };

  const deleteCoupon = async (id) => {
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(cs => cs.filter(c => c._id!==id));
      dispatch(showToast({ message:'Coupon deleted', type:'success' }));
    } catch {
      dispatch(showToast({ message:'Delete failed', type:'error' }));
    } finally { setDeleteId(null); }
  };

  const isExpired = (expires) => expires && new Date(expires) < new Date();

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Coupons</h1>
            <p className="admin-page__subtitle">{coupons.filter(c=>c.isActive&&!isExpired(c.expiresAt)).length} active codes</p>
          </div>
          <div style={{ display:'flex', gap:'var(--space-2)' }}>
            <button className="btn btn-outline btn-sm" onClick={fetchCoupons}><RefreshCw size={13}/></button>
            <button className="btn btn-accent btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? <X size={13}/> : <Plus size={13}/>}
              {showForm ? 'Cancel' : 'New Coupon'}
            </button>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="admin-chart-card">
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'var(--space-5)', color:'var(--text-primary)' }}>
            Create Coupon Code
          </h3>
          <form onSubmit={createCoupon}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'var(--space-4)', marginBottom:'var(--space-4)' }}>
              <div>
                <label className="input-label">Coupon Code *</label>
                <input className="input-field" placeholder="e.g. SUMMER25" required
                  style={{ textTransform:'uppercase', fontFamily:'var(--font-mono)', fontWeight:700 }}
                  value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))}/>
              </div>
              <div>
                <label className="input-label">Discount Amount *</label>
                <input className="input-field" type="number" min={1} max={100} required
                  value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))}/>
              </div>
              <div>
                <label className="input-label">Type</label>
                <select className="input-field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>
              <div>
                <label className="input-label">Usage Limit</label>
                <input className="input-field" type="number" min={1} placeholder="Leave blank = unlimited"
                  value={form.usageLimit} onChange={e=>setForm(f=>({...f,usageLimit:e.target.value}))}/>
              </div>
              <div>
                <label className="input-label">Min. Order Value (₦)</label>
                <input className="input-field" type="number" min={0}
                  value={form.minOrderValue} onChange={e=>setForm(f=>({...f,minOrderValue:e.target.value}))}/>
              </div>
              <div>
                <label className="input-label">Expiry Date</label>
                <input className="input-field" type="date"
                  value={form.expiresAt} onChange={e=>setForm(f=>({...f,expiresAt:e.target.value}))}/>
              </div>
            </div>
            <button type="submit" className="btn btn-accent btn-sm" disabled={creating}>
              {creating ? 'Creating…' : 'Create Coupon'}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="admin-chart-card">
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding:'var(--space-10)', textAlign:'center', color:'var(--text-muted)' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : coupons.length === 0 ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>
              <Tag size={36} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }}/>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>No coupon codes yet.</p>
              <button className="btn btn-accent btn-sm" style={{ marginTop:'var(--space-4)' }} onClick={()=>setShowForm(true)}>
                <Plus size={13}/> Create First Coupon
              </button>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Code</th><th>Discount</th><th>Type</th><th>Usage</th><th>Min. Order</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {coupons.map(c => {
                  const expired = isExpired(c.expiresAt);
                  const usedPct = c.usageLimit ? (c.usageCount/c.usageLimit)*100 : 0;
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                          <Tag size={13} color="var(--color-accent)"/>
                          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>{c.code}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.125rem', color:'var(--color-accent)' }}>
                          {c.discount}{c.type==='percentage'?'%':'₦'}
                        </span>
                      </td>
                      <td style={{ fontSize:'0.8125rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{c.type}</td>
                      <td>
                        {c.usageLimit ? (
                          <div>
                            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:4 }}>{c.usageCount}/{c.usageLimit}</p>
                            <div style={{ height:4, background:'var(--border-color)', borderRadius:2, width:80 }}>
                              <div style={{ height:'100%', background: usedPct>80?'var(--color-error)':'var(--color-accent)', borderRadius:2, width:`${Math.min(usedPct,100)}%` }}/>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>{c.usageCount} used · Unlimited</span>
                        )}
                      </td>
                      <td style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>
                        {c.minOrderValue > 0 ? `₦${c.minOrderValue.toLocaleString()}` : <span style={{ color:'var(--text-muted)' }}>None</span>}
                      </td>
                      <td style={{ fontSize:'0.8125rem', color: expired?'var(--color-error)':'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiry'}
                        {expired && <span style={{ marginLeft:4, fontWeight:700 }}>(Expired)</span>}
                      </td>
                      <td>
                        <button
                          className={`admin-status ${c.isActive&&!expired?'admin-status--delivered':'admin-status--pending'}`}
                          style={{ border:'none', cursor:'pointer' }}
                          onClick={() => toggleActive(c._id, c.isActive)}>
                          {c.isActive&&!expired ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        {deleteId===c._id ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-sm" style={{ background:'var(--color-error)', color:'#fff', padding:'4px 10px', borderRadius:'var(--radius-md)', fontWeight:700, fontSize:'0.75rem', border:'none', cursor:'pointer' }}
                              onClick={()=>deleteCoupon(c._id)}>Confirm</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} onClick={()=>setDeleteId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{ padding:6, color:'var(--color-error)' }}
                            onClick={()=>setDeleteId(c._id)}>
                            <Trash2 size={13}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
