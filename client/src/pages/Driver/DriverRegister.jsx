// src/pages/Driver/DriverRegister.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Truck, User, Phone, Mail, Car, Hash, Shield, CheckCircle, AlertCircle,
  ChevronRight, ShirtIcon, MapPin, Lock, Upload, FileCheck, Loader2, UserCheck,
} from 'lucide-react';
import api from '../../utils/api';
import './Driver.css';

const VEHICLE_TYPES = [
  { value:'motorcycle', label:'Motorcycle', icon:'🏍️' },
  { value:'car',        label:'Car',        icon:'🚗' },
  { value:'van',        label:'Van',        icon:'🚐' },
  { value:'truck',      label:'Truck',      icon:'🚚' },
];
const STATES = ['Lagos','Abuja','Kano','Rivers','Oyo','Delta','Edo','Anambra','Enugu','Imo','Ogun','Kaduna'];
const ID_TYPES = [
  { value:'nin',            label:"National ID (NIN)" },
  { value:'passport',       label:'International Passport' },
  { value:'voters_card',    label:"Voter's Card" },
  { value:'drivers_license',label:"Driver's License" },
];
const STEPS = ['Personal Info','Vehicle Info','Documents','Review & Submit'];

// ── One document upload slot: pick a file → upload to Cloudinary via the
// public driver-document endpoint → show a preview + "uploaded" state. ──
function DocUpload({ label, hint, value, onChange, required }) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('document', file);
      const { data } = await api.post('/uploads/driver-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed — please try again.');
    } finally { setUploading(false); }
  };

  return (
    <div className="driver-form__field">
      <label className="input-label">
        <FileCheck size={12}/> {label} {required && <span style={{ color:'var(--color-error)' }}>*</span>}
      </label>
      {hint && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2, marginBottom:6 }}>{hint}</p>}
      <label className={`driver-doc-upload ${value ? 'driver-doc-upload--done' : ''}`}>
        <input type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} disabled={uploading}/>
        {uploading ? (
          <><Loader2 size={16} className="driver-doc-upload__spin"/> Uploading…</>
        ) : value ? (
          <><CheckCircle size={16} color="var(--color-success)"/> Uploaded — tap to replace</>
        ) : (
          <><Upload size={16}/> Tap to upload photo</>
        )}
      </label>
      {value && !uploading && (
        <img src={value} alt="" className="driver-doc-upload__preview"/>
      )}
      {error && <p className="driver-form__error" style={{ marginTop:6 }}><AlertCircle size={12}/> {error}</p>}
    </div>
  );
}

export default function DriverRegister() {
  const [step,       setStep]       = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');
  const [form, setForm] = useState({
    name:'', email:'', phone:'', password:'',
    vehicleType:'motorcycle', vehicleMake:'', vehicleModel:'',
    vehiclePlate:'', vehicleColor:'',
    licenseNumber:'', licenseExpiry:'', serviceArea:'Lagos',
    photo: '',
    documents: {
      licenseImage: '', vehicleRegistrationImage: '', insuranceImage: '', insuranceExpiry: '',
      governmentIdType: '', governmentIdImage: '', governmentIdNumber: '',
    },
    guarantor: { name: '', phone: '', address: '', relationship: '' },
  });

  const set     = (k,v) => setForm(f=>({...f,[k]:v}));
  const setDoc  = (k,v) => setForm(f=>({...f, documents: { ...f.documents, [k]: v } }));
  const setGuar = (k,v) => setForm(f=>({...f, guarantor: { ...f.guarantor, [k]: v } }));

  const validateStep = () => {
    if (step===0) {
      if (!form.name.trim())   return setError('Full name is required'),      false;
      if (!form.email.trim())  return setError('Email address is required'),   false;
      if (!/\S+@\S+\.\S+/.test(form.email)) return setError('Invalid email'), false;
      if (!form.phone.trim())  return setError('Phone number is required'),    false;
      if (form.password.length < 8) return setError('Password must be at least 8 characters'), false;
    }
    if (step===1) {
      if (!form.vehiclePlate.trim())  return setError('Plate number is required'),  false;
      if (!form.licenseNumber.trim()) return setError('License number is required'), false;
    }
    if (step===2) {
      const d = form.documents;
      if (!d.licenseImage)             return setError("Please upload a photo of your driver's license"), false;
      if (!d.vehicleRegistrationImage) return setError('Please upload your vehicle registration/particulars'), false;
      if (!d.insuranceImage)           return setError('Please upload your vehicle insurance certificate'), false;
      if (!d.governmentIdType)         return setError('Please select a government ID type'), false;
      if (!d.governmentIdImage)        return setError('Please upload a photo of your government ID'), false;
      if (!form.guarantor.name.trim() || !form.guarantor.phone.trim())
        return setError("A guarantor's name and phone number are required"), false;
    }
    setError(''); return true;
  };

  const next = () => { if (!validateStep()) return; setStep(s=>s+1); };
  const prev = () => { setError(''); setStep(s=>s-1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true); setError('');
    try {
      await api.post('/drivers/register', form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="driver-reg-success">
        <motion.div className="driver-reg-success__card" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}>
          <div className="driver-reg-success__icon"><CheckCircle size={52} color="var(--color-success)"/></div>
          <h2>Application Submitted!</h2>
          <p>Thank you, <strong>{form.name}</strong>! We'll review your documents and application within 24–48 hours and email you at <strong>{form.email}</strong>.</p>
          <div style={{display:'flex',gap:'var(--space-3)',justifyContent:'center',marginTop:'var(--space-6)'}}>
            <Link to="/" className="btn btn-accent">Back to Home</Link>
            <Link to="/driver/login" className="btn btn-outline">Driver Login</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="driver-reg">
      <div className="driver-reg__header">
        <Link to="/" className="driver-reg__logo"><ShirtIcon size={18} className="text-accent"/> ShirtCraft</Link>
        <div className="driver-reg__title-group">
          <div className="driver-reg__badge"><Truck size={14}/> Delivery Partner Programme</div>
          <h1 className="driver-reg__title">Drive with ShirtCraft</h1>
          <p className="driver-reg__subtitle">Earn money delivering custom shirts across Nigeria. Flexible hours, weekly payouts, and full support.</p>
        </div>
      </div>

      <div className="driver-benefits">
        {[{icon:'💰',text:'Competitive pay per delivery'},{icon:'⏰',text:'Flexible working hours'},{icon:'📱',text:'Easy-to-use driver app'},{icon:'🗺️',text:'Real-time order assignment'}]
          .map(b=><div key={b.text} className="driver-benefit"><span>{b.icon}</span><span>{b.text}</span></div>)}
      </div>

      <div className="driver-reg__form-wrap">
        {/* Stepper */}
        <div className="driver-stepper">
          {STEPS.map((s,i)=>(
            <div key={s} className="driver-stepper__item">
              <div className={`driver-stepper__dot ${i<step?'done':i===step?'active':''}`}>
                {i<step?<CheckCircle size={13}/>:i+1}
              </div>
              <span className={`driver-stepper__label ${i===step?'active':''}`}>{s}</span>
              {i<STEPS.length-1&&<div className={`driver-stepper__line ${i<step?'done':''}`}/>}
            </div>
          ))}
        </div>

        <form className="driver-form" onSubmit={handleSubmit}>
          {error && <div className="driver-form__error"><AlertCircle size={13}/> {error}</div>}

          {step===0 && (
            <motion.div key="s0" className="driver-form__section" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
              <h3 className="driver-form__section-title">Personal Information</h3>
              <div className="driver-form__field"><label className="input-label"><User size={12}/> Full Name *</label>
                <input className="input-field" placeholder="Emeka Okonkwo" value={form.name} onChange={e=>set('name',e.target.value)} required/></div>
              <div className="driver-form__field"><label className="input-label"><Mail size={12}/> Email Address *</label>
                <input className="input-field" type="email" placeholder="emeka@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required/></div>
              <div className="driver-form__field"><label className="input-label"><Phone size={12}/> Phone Number *</label>
                <input className="input-field" type="tel" placeholder="+234 801 234 5678" value={form.phone} onChange={e=>set('phone',e.target.value)} required/></div>
              <div className="driver-form__field"><label className="input-label"><Lock size={12}/> Password *</label>
                <input className="input-field" type="password" placeholder="At least 8 characters" value={form.password} onChange={e=>set('password',e.target.value)} required/>
                <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>You'll use this — not your phone number — to log into the driver app.</p></div>
              <div className="driver-form__field"><label className="input-label"><MapPin size={12}/> Service Area *</label>
                <select className="input-field" value={form.serviceArea} onChange={e=>set('serviceArea',e.target.value)}>
                  {STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <button type="button" className="btn btn-accent btn-lg" style={{width:'100%'}} onClick={next}>Continue <ChevronRight size={16}/></button>
            </motion.div>
          )}

          {step===1 && (
            <motion.div key="s1" className="driver-form__section" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
              <h3 className="driver-form__section-title">Vehicle Information</h3>
              <div className="driver-form__field"><label className="input-label"><Car size={12}/> Vehicle Type *</label>
                <div className="driver-vehicle-grid">
                  {VEHICLE_TYPES.map(v=>(
                    <button key={v.value} type="button" className={`driver-vehicle-btn ${form.vehicleType===v.value?'active':''}`} onClick={()=>set('vehicleType',v.value)}>
                      <span className="driver-vehicle-btn__icon">{v.icon}</span><span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="driver-form__row">
                <div className="driver-form__field"><label className="input-label">Make / Brand</label>
                  <input className="input-field" placeholder="e.g. Honda" value={form.vehicleMake} onChange={e=>set('vehicleMake',e.target.value)}/></div>
                <div className="driver-form__field"><label className="input-label">Model</label>
                  <input className="input-field" placeholder="e.g. CB125" value={form.vehicleModel} onChange={e=>set('vehicleModel',e.target.value)}/></div>
              </div>
              <div className="driver-form__row">
                <div className="driver-form__field"><label className="input-label"><Hash size={12}/> Plate Number *</label>
                  <input className="input-field" placeholder="ABC-123DE" style={{textTransform:'uppercase',fontFamily:'var(--font-mono)',fontWeight:700}} value={form.vehiclePlate} onChange={e=>set('vehiclePlate',e.target.value.toUpperCase())} required/></div>
                <div className="driver-form__field"><label className="input-label">Vehicle Colour</label>
                  <input className="input-field" placeholder="e.g. Red" value={form.vehicleColor} onChange={e=>set('vehicleColor',e.target.value)}/></div>
              </div>
              <div className="driver-form__row">
                <div className="driver-form__field"><label className="input-label"><Shield size={12}/> License No. *</label>
                  <input className="input-field" placeholder="NIG-xxxx-xxxxx" style={{fontFamily:'var(--font-mono)'}} value={form.licenseNumber} onChange={e=>set('licenseNumber',e.target.value)} required/></div>
                <div className="driver-form__field"><label className="input-label">License Expiry</label>
                  <input className="input-field" type="date" value={form.licenseExpiry} onChange={e=>set('licenseExpiry',e.target.value)}/></div>
              </div>
              <div style={{display:'flex',gap:'var(--space-3)'}}>
                <button type="button" className="btn btn-outline" onClick={prev}>← Back</button>
                <button type="button" className="btn btn-accent btn-lg" style={{flex:1}} onClick={next}>Continue <ChevronRight size={16}/></button>
              </div>
            </motion.div>
          )}

          {step===2 && (
            <motion.div key="s2" className="driver-form__section" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
              <h3 className="driver-form__section-title">Verification Documents</h3>
              <p style={{ fontSize:'0.8125rem', color:'var(--text-muted)', marginTop:-8, marginBottom:'var(--space-2)' }}>
                These are kept confidential and only used to verify your identity and eligibility to deliver for ShirtCraft.
              </p>

              <DocUpload label="Driver's License (photo)" required
                value={form.documents.licenseImage} onChange={v=>setDoc('licenseImage',v)}/>
              <DocUpload label="Vehicle Registration / Particulars" required
                hint="Proof of ownership or particulars of the vehicle you'll deliver with."
                value={form.documents.vehicleRegistrationImage} onChange={v=>setDoc('vehicleRegistrationImage',v)}/>
              <DocUpload label="Vehicle Insurance Certificate" required
                value={form.documents.insuranceImage} onChange={v=>setDoc('insuranceImage',v)}/>
              <div className="driver-form__field">
                <label className="input-label">Insurance Expiry Date</label>
                <input className="input-field" type="date" value={form.documents.insuranceExpiry} onChange={e=>setDoc('insuranceExpiry',e.target.value)}/>
              </div>

              <div className="driver-form__row">
                <div className="driver-form__field">
                  <label className="input-label">Government ID Type *</label>
                  <select className="input-field" value={form.documents.governmentIdType} onChange={e=>setDoc('governmentIdType',e.target.value)}>
                    <option value="">— Select —</option>
                    {ID_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="driver-form__field">
                  <label className="input-label">ID Number</label>
                  <input className="input-field" value={form.documents.governmentIdNumber} onChange={e=>setDoc('governmentIdNumber',e.target.value)}/>
                </div>
              </div>
              <DocUpload label="Government ID (photo)" required
                value={form.documents.governmentIdImage} onChange={v=>setDoc('governmentIdImage',v)}/>
              <DocUpload label="Passport Photograph" hint="A clear photo of your face, used on your driver profile."
                value={form.photo} onChange={v=>set('photo',v)}/>

              <h3 className="driver-form__section-title" style={{ marginTop:'var(--space-6)' }}>
                <UserCheck size={15} style={{ display:'inline', verticalAlign:'-2px', marginRight:6 }}/>
                Guarantor Details
              </h3>
              <p style={{ fontSize:'0.8125rem', color:'var(--text-muted)', marginTop:-8, marginBottom:'var(--space-2)' }}>
                Someone we can contact who can vouch for you — a relative, employer, or long-standing acquaintance.
              </p>
              <div className="driver-form__row">
                <div className="driver-form__field"><label className="input-label">Guarantor Name *</label>
                  <input className="input-field" value={form.guarantor.name} onChange={e=>setGuar('name',e.target.value)} required/></div>
                <div className="driver-form__field"><label className="input-label">Guarantor Phone *</label>
                  <input className="input-field" type="tel" value={form.guarantor.phone} onChange={e=>setGuar('phone',e.target.value)} required/></div>
              </div>
              <div className="driver-form__row">
                <div className="driver-form__field"><label className="input-label">Relationship</label>
                  <input className="input-field" placeholder="e.g. Uncle, Employer" value={form.guarantor.relationship} onChange={e=>setGuar('relationship',e.target.value)}/></div>
                <div className="driver-form__field"><label className="input-label">Address</label>
                  <input className="input-field" value={form.guarantor.address} onChange={e=>setGuar('address',e.target.value)}/></div>
              </div>

              <div style={{display:'flex',gap:'var(--space-3)'}}>
                <button type="button" className="btn btn-outline" onClick={prev}>← Back</button>
                <button type="button" className="btn btn-accent btn-lg" style={{flex:1}} onClick={next}>Review Application <ChevronRight size={16}/></button>
              </div>
            </motion.div>
          )}

          {step===3 && (
            <motion.div key="s3" className="driver-form__section" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
              <h3 className="driver-form__section-title">Review Your Application</h3>
              <div className="driver-review">
                <div className="driver-review__group">
                  <h4>Personal</h4>
                  {[['Name',form.name],['Email',form.email],['Phone',form.phone],['Service Area',form.serviceArea]].map(([k,v])=>(
                    <div key={k} className="driver-review__row"><span>{k}</span><strong>{v}</strong></div>
                  ))}
                </div>
                <div className="driver-review__group">
                  <h4>Vehicle</h4>
                  {[['Type',form.vehicleType],['Make/Model',`${form.vehicleMake} ${form.vehicleModel}`.trim()||'—'],['Plate',form.vehiclePlate],['Licence',form.licenseNumber]].map(([k,v])=>(
                    <div key={k} className="driver-review__row"><span>{k}</span><strong style={{fontFamily:k==='Plate'||k==='Licence'?'var(--font-mono)':undefined,textTransform:'capitalize'}}>{v}</strong></div>
                  ))}
                </div>
                <div className="driver-review__group">
                  <h4>Documents</h4>
                  {[
                    ["Driver's License", form.documents.licenseImage],
                    ['Vehicle Registration', form.documents.vehicleRegistrationImage],
                    ['Insurance', form.documents.insuranceImage],
                    ['Government ID', form.documents.governmentIdImage],
                    ['Passport Photo', form.photo],
                  ].map(([k,v])=>(
                    <div key={k} className="driver-review__row">
                      <span>{k}</span>
                      <strong style={{ color: v ? 'var(--color-success)' : 'var(--color-error)', display:'flex', alignItems:'center', gap:4 }}>
                        {v ? <><CheckCircle size={13}/> Uploaded</> : 'Missing'}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="driver-review__group">
                  <h4>Guarantor</h4>
                  {[['Name',form.guarantor.name],['Phone',form.guarantor.phone],['Relationship',form.guarantor.relationship||'—']].map(([k,v])=>(
                    <div key={k} className="driver-review__row"><span>{k}</span><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
              <p className="driver-review__terms">By submitting, you confirm all information and documents are accurate and agree to our <Link to="/terms" className="auth-card__link">Driver Terms</Link>.</p>
              <div style={{display:'flex',gap:'var(--space-3)'}}>
                <button type="button" className="btn btn-outline" onClick={prev}>← Back</button>
                <button type="submit" className="btn btn-accent btn-lg" style={{flex:1}} disabled={submitting}>
                  {submitting?'Submitting…':'Submit Application'}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
