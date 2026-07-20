// src/pages/Dashboard/Profile.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import { Save, MapPin, Plus, Trash2 } from 'lucide-react';

const INITIAL_ADDRESSES = [
  { id: 'a1', label: 'Home', street: '12 Allen Avenue', city: 'Lagos', state: 'Lagos', default: true  },
  { id: 'a2', label: 'Office', street: '5 Wuse Zone 2',  city: 'Abuja',  state: 'FCT',   default: false },
];

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);

  const [profile, setProfile] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: '',
  });
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', state: '' });
  const [showAddrForm, setShowAddrForm] = useState(false);

  const saveProfile = (e) => {
    e.preventDefault();
    dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
  };

  const addAddress = (e) => {
    e.preventDefault();
    setAddresses(as => [...as, { ...newAddr, id: 'a' + Date.now(), default: as.length === 0 }]);
    setNewAddr({ label: '', street: '', city: '', state: '' });
    setShowAddrForm(false);
  };

  return (
    <div className="dash-section">
      <h2 className="dash-section__title">Profile & Settings</h2>

      {/* Personal details */}
      <div className="profile-card">
        <h3 className="profile-card__title">Personal Information</h3>
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="profile-form__row">
            <div>
              <label className="input-label">Full Name</label>
              <input className="input-field" value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="input-label">Phone Number</label>
            <input className="input-field" type="tel" placeholder="+234 800 000 0000" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>
            <Save size={14} /> Save Changes
          </button>
        </form>
      </div>

      {/* Addresses */}
      <div className="profile-card">
        <div className="profile-card__header">
          <h3 className="profile-card__title">Saved Addresses</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAddrForm(!showAddrForm)}>
            <Plus size={14} /> Add Address
          </button>
        </div>

        {showAddrForm && (
          <form className="profile-form" onSubmit={addAddress} style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="profile-form__row">
              <div>
                <label className="input-label">Label (Home / Office)</label>
                <input className="input-field" placeholder="e.g. Home" value={newAddr.label}
                  onChange={e => setNewAddr(a => ({ ...a, label: e.target.value }))} required />
              </div>
              <div>
                <label className="input-label">Street Address</label>
                <input className="input-field" placeholder="123 Main Street" value={newAddr.street}
                  onChange={e => setNewAddr(a => ({ ...a, street: e.target.value }))} required />
              </div>
            </div>
            <div className="profile-form__row">
              <div>
                <label className="input-label">City</label>
                <input className="input-field" value={newAddr.city}
                  onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))} required />
              </div>
              <div>
                <label className="input-label">State</label>
                <input className="input-field" value={newAddr.state}
                  onChange={e => setNewAddr(a => ({ ...a, state: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button type="submit" className="btn btn-primary btn-sm">Save Address</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddrForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="addresses-grid">
          {addresses.map(a => (
            <div key={a.id} className={`address-card ${a.default ? 'address-card--default' : ''}`}>
              {a.default && <span className="address-card__badge">Default</span>}
              <div className="address-card__icon"><MapPin size={16} /></div>
              <p className="address-card__label">{a.label}</p>
              <p className="address-card__street">{a.street}</p>
              <p className="address-card__city">{a.city}, {a.state}</p>
              <div className="address-card__actions">
                {!a.default && (
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => setAddresses(as => as.map(x => ({ ...x, default: x.id === a.id })))}>
                    Set Default
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                  onClick={() => setAddresses(as => as.filter(x => x.id !== a.id))}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Password change section */}
      <div className="profile-card">
        <h3 className="profile-card__title">Change Password</h3>
        <form className="profile-form" onSubmit={e => { e.preventDefault(); dispatch(showToast({ message: 'Password updated!', type: 'success' })); }}>
          <div>
            <label className="input-label">Current Password</label>
            <input className="input-field" type="password" placeholder="••••••••" />
          </div>
          <div className="profile-form__row">
            <div>
              <label className="input-label">New Password</label>
              <input className="input-field" type="password" placeholder="••••••••" />
            </div>
            <div>
              <label className="input-label">Confirm New Password</label>
              <input className="input-field" type="password" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>
            <Save size={14} /> Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
