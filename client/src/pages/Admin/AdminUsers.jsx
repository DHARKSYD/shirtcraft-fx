// src/pages/Admin/AdminUsers.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Shield, ShieldOff, Search, Ban, CheckCircle, Trash2, RefreshCw, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';
import './AdminUsers.css';

export default function AdminUsers() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(s => s.auth.user);

  const [users,     setUsers]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search,    setSearch]    = useState('');
  const [roleFilter,setRoleFilter]= useState('all'); // all | customer | admin
  const [page,      setPage]      = useState(1);
  const [showCreate,setShowCreate]= useState(false);
  const [newAdmin,  setNewAdmin]  = useState({ name:'', email:'', password:'' });
  const [creating,  setCreating]  = useState(false);
  const [confirmId, setConfirmId] = useState(null); // for delete confirm

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { search, role: roleFilter === 'all' ? '' : roleFilter, page, limit: 15 },
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      dispatch(showToast({ message: 'Failed to fetch users', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

  // Promote/demote
  const toggleAdminRole = async (userId, currentRole) => {
    if (userId === currentAdmin._id || userId === currentAdmin.id) {
      dispatch(showToast({ message: 'You cannot change your own role', type: 'error' }));
      return;
    }
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(us => us.map(u => u._id === userId ? { ...u, role: newRole } : u));
      dispatch(showToast({
        message: newRole === 'admin' ? 'User promoted to Admin' : 'Admin role removed',
        type: 'success',
      }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Role update failed', type: 'error' }));
    }
  };

  // Activate / deactivate
  const toggleActive = async (userId, currentStatus) => {
    if (userId === currentAdmin._id || userId === currentAdmin.id) {
      dispatch(showToast({ message: 'You cannot deactivate your own account', type: 'error' }));
      return;
    }
    try {
      await api.put(`/admin/users/${userId}/active`, { isActive: !currentStatus });
      setUsers(us => us.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
      dispatch(showToast({ message: !currentStatus ? 'Account activated' : 'Account deactivated', type: 'success' }));
    } catch {
      dispatch(showToast({ message: 'Status update failed', type: 'error' }));
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (userId === currentAdmin._id || userId === currentAdmin.id) {
      dispatch(showToast({ message: 'You cannot delete your own account', type: 'error' }));
      setConfirmId(null);
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(us => us.filter(u => u._id !== userId));
      setTotal(t => t - 1);
      dispatch(showToast({ message: 'User deleted permanently', type: 'success' }));
    } catch {
      dispatch(showToast({ message: 'Delete failed', type: 'error' }));
    } finally {
      setConfirmId(null);
    }
  };

  // Create new admin account
  const createAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/admin/users/create-admin', newAdmin);
      setUsers(us => [data, ...us]);
      setTotal(t => t + 1);
      setNewAdmin({ name:'', email:'', password:'' });
      setShowCreate(false);
      dispatch(showToast({ message: `Admin account created for ${data.name}`, type: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Failed to create admin', type: 'error' }));
    } finally {
      setCreating(false);
    }
  };

  const pages = Math.ceil(total / 15);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-4)' }}>
          <div>
            <h1 className="admin-page__title">User Management</h1>
            <p className="admin-page__subtitle">{total} registered users · Promote to admin, deactivate, or remove accounts</p>
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => setShowCreate(!showCreate)}>
            <UserPlus size={14}/> Create Admin Account
          </button>
        </div>
      </div>

      {/* Create Admin Form */}
      {showCreate && (
        <motion.div className="admin-chart-card"
          initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}>
          <div className="admin-chart-card__header">
            <h3><Shield size={16} style={{ display:'inline', marginRight:6, color:'var(--color-accent)' }}/>Create New Admin Account</h3>
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }} onClick={() => setShowCreate(false)}>
              <X size={18}/>
            </button>
          </div>
          <form onSubmit={createAdmin} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:'var(--space-4)', alignItems:'flex-end' }}>
            <div>
              <label className="input-label">Full Name</label>
              <input className="input-field" placeholder="Admin Name" required
                value={newAdmin.name} onChange={e => setNewAdmin(a => ({...a, name: e.target.value}))}/>
            </div>
            <div>
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" placeholder="admin@shirtcraft.com" required
                value={newAdmin.email} onChange={e => setNewAdmin(a => ({...a, email: e.target.value}))}/>
            </div>
            <div>
              <label className="input-label">Temporary Password</label>
              <input className="input-field" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" required minLength={8}
                value={newAdmin.password} onChange={e => setNewAdmin(a => ({...a, password: e.target.value}))}/>
            </div>
            <div style={{ display:'flex', gap:'var(--space-2)' }}>
              <button type="submit" className="btn btn-accent btn-sm" disabled={creating}>
                {creating ? 'Creating…' : 'Create Admin'}
              </button>
            </div>
          </form>
          <p style={{ marginTop:'var(--space-3)', fontSize:'0.8125rem', color:'var(--text-muted)' }}>
            The new admin will receive a welcome email and can reset their password on first login.
          </p>
        </motion.div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input className="input-field" style={{ paddingLeft:'2.5rem', borderRadius:'var(--radius-full)' }}
            placeholder="Search by name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <div style={{ display:'flex', gap:'var(--space-2)' }}>
          {['all','customer','admin'].map(r => (
            <button key={r} className={`btn btn-sm ${roleFilter===r?'btn-primary':'btn-outline'}`}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              style={{ textTransform:'capitalize' }}>{r === 'all' ? 'All Users' : r+'s'}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchUsers}><RefreshCw size={14}/> Refresh</button>
      </div>

      {/* Table */}
      <div className="admin-chart-card">
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>Loading users…</div>
          ) : users.length === 0 ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>No users found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u._id === (currentAdmin._id || currentAdmin.id);
                  return (
                    <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.55 }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', background: u.role==='admin'?'var(--color-accent)':'#6B7280', color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.875rem', flexShrink:0 }}>
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>
                              {u.name} {isMe && <span style={{ fontSize:'0.7rem', color:'var(--color-accent)', fontWeight:700 }}>(You)</span>}
                            </p>
                            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric' })}
                      </td>
                      <td>
                        <span className={`admin-status ${u.role==='admin'?'admin-status--delivered':'admin-status--shipped'}`}
                          style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                          {u.role === 'admin' && <Shield size={10}/>}
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-status ${u.isActive?'admin-status--delivered':'admin-status--pending'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:'var(--space-1)', flexWrap:'wrap' }}>
                          {/* Promote / Demote */}
                          <button
                            title={u.role==='admin'?'Remove Admin Role':'Promote to Admin'}
                            className="admin-action-btn"
                            style={{ color: u.role==='admin'?'var(--color-warning)':'var(--color-success)' }}
                            onClick={() => toggleAdminRole(u._id, u.role)}
                            disabled={isMe}>
                            {u.role === 'admin' ? <ShieldOff size={14}/> : <Shield size={14}/>}
                            <span>{u.role==='admin'?'Demote':'Make Admin'}</span>
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            title={u.isActive?'Deactivate Account':'Activate Account'}
                            className="admin-action-btn"
                            style={{ color: u.isActive?'var(--color-warning)':'var(--color-success)' }}
                            onClick={() => toggleActive(u._id, u.isActive)}
                            disabled={isMe}>
                            {u.isActive ? <Ban size={14}/> : <CheckCircle size={14}/>}
                            <span>{u.isActive?'Deactivate':'Activate'}</span>
                          </button>

                          {/* Delete */}
                          {confirmId === u._id ? (
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="admin-action-btn" style={{ color:'var(--color-error)', fontWeight:700 }}
                                onClick={() => deleteUser(u._id)}>Confirm Delete</button>
                              <button className="admin-action-btn" onClick={() => setConfirmId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button
                              title="Delete user permanently"
                              className="admin-action-btn"
                              style={{ color:'var(--color-error)' }}
                              onClick={() => setConfirmId(u._id)}
                              disabled={isMe}>
                              <Trash2 size={14}/><span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'var(--space-2)', padding:'var(--space-4)', borderTop:'1px solid var(--border-color)' }}>
            {Array.from({ length: pages }, (_,i) => i+1).map(p => (
              <button key={p} className={`catalog-pagination__btn ${page===p?'catalog-pagination__btn--active':''}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
