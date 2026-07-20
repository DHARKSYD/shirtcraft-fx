// src/pages/Admin/AdminProducts.jsx — full CRUD, real API, image upload
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Search, X, Upload, Package,
  CheckCircle, AlertCircle, RefreshCw, ChevronDown, ImageOff,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';
import './AdminProducts.css';

// ── Constants ─────────────────────────────────────────────────────
const CATEGORIES = ['Classic Tees','Premium Fitted','Oversized','Polo Shirts','Long Sleeve','V-Neck'];
const ALL_COLORS  = ['white','black','navy','red','green','blue','grey','gold','pink','purple'];
const ALL_SIZES   = ['XS','S','M','L','XL','2XL','3XL'];
const ALL_TAGS    = ['bestseller','new','trending','premium','eco'];

const COLOR_HEX = {
  white:'#fff',black:'#111',navy:'#1e3a5f',red:'#FF4F1F',green:'#1a5c38',
  blue:'#4da6ff',grey:'#9ca3af',gold:'#f59e0b',pink:'#f9a8d4',purple:'#7c3aed',
};

const EMPTY_FORM = {
  name:'', description:'', price:'', comparePrice:'',
  category: CATEGORIES[0],
  colors: ['white','black'],
  sizes: ['S','M','L','XL'],
  features: [''],
  tags: [],
  variants: [],
  packInfo: { isPack:false, packSize:3, packMode:'single-color', mixedColors:[] },
  images: [],
  colorImages: {},
};

// ── Slide-out Drawer ──────────────────────────────────────────────
function ProductDrawer({ product, onClose, onSave }) {
  const dispatch    = useDispatch();
  const fileRef     = useRef(null);
  const [form, setForm]         = useState(product ? {
    ...product,
    price:        String(product.price || ''),
    comparePrice: String(product.comparePrice || ''),
    features:     product.features?.length ? product.features : [''],
    colorImages:  product.colorImages || {},
    variants:     product.variants?.length ? product.variants : [],
    packInfo:     product.packInfo?.isPack ? product.packInfo : { isPack:false, packSize:3, packMode:'single-color', mixedColors:[] },
  } : { ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Keeps the size×colour stock grid in lockstep with whichever
  // colours/sizes/pack-mode are currently selected — add a colour and a
  // new column of stock=0 cells appears for every size; remove one and its
  // cells drop out, but every OTHER cell keeps whatever stock was already
  // typed in (matched by size+colour, not by array position).
  useEffect(() => {
    const isMixedPack = form.packInfo?.isPack && form.packInfo?.packMode === 'mixed';
    const colorDim = isMixedPack ? ['Mixed'] : (form.colors.length ? form.colors : [null]);
    const sizeDim  = form.sizes.length ? form.sizes : [null];
    setForm(f => ({
      ...f,
      variants: sizeDim.flatMap(size => colorDim.map(color => {
        const existing = f.variants?.find(v => (v.size||null)===(size||null) && (v.color||null)===(color||null));
        return { size, color, stock: existing ? existing.stock : 0 };
      })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.colors, form.sizes, form.packInfo?.isPack, form.packInfo?.packMode]);

  const setVariantStock = (size, color, stock) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ((v.size||null)===(size||null) && (v.color||null)===(color||null))
        ? { ...v, stock: Math.max(0, Number(stock) || 0) } : v),
    }));
  };

  const totalStock = form.variants.reduce((sum,v) => sum + (Number(v.stock)||0), 0);

  // Validate
  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name = 'Product name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.price || isNaN(form.price) || +form.price <= 0) e.price = 'Valid price required';
    if (!form.colors.length)  e.colors = 'Select at least one colour';
    if (!form.sizes.length)   e.sizes  = 'Select at least one size';
    if (!form.images.length)  e.images = 'Add at least one product image';
    if (form.packInfo?.isPack && form.packInfo.packMode === 'mixed' && form.packInfo.mixedColors.length < 2)
      e.packInfo = 'Pick at least 2 colours for a mixed pack';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Image upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        const { data } = await api.post('/uploads/image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push(data.url);
      }
      set('images', [...form.images, ...uploaded]);
      dispatch(showToast({ message: `${uploaded.length} image(s) uploaded`, type:'success' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Upload failed', type:'error' }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:        Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        features:     form.features.filter(f => f.trim()),
        variants:     form.variants,
        packInfo:     form.packInfo,
      };
      let result;
      if (product) {
        const { data } = await api.put(`/products/${product._id}`, payload);
        result = data;
      } else {
        const { data } = await api.post('/products', payload);
        result = data;
      }
      dispatch(showToast({ message: product ? 'Product updated!' : 'Product created!', type:'success' }));
      onSave(result, !!product);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Save failed', type:'error' }));
    } finally {
      setSaving(false);
    }
  };

  // Toggle helpers
  const toggleArr = (key, val) =>
    set(key, form[key].includes(val) ? form[key].filter(x=>x!==val) : [...form[key], val]);

  const updateFeature = (idx, val) => {
    const next = [...form.features];
    next[idx] = val;
    set('features', next);
  };

  return (
    <motion.div className="prod-drawer-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.aside className="prod-drawer"
        initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', damping:28, stiffness:280 }}>

        <div className="prod-drawer__header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="prod-drawer__close" onClick={onClose}><X size={18}/></button>
        </div>

        <form className="prod-drawer__body" onSubmit={handleSave}>

          {/* Images */}
          <div className="pd-section">
            <label className="pd-section__title">Product Images *</label>
            {errors.images && <p className="pd-error">{errors.images}</p>}
            <div className="pd-images">
              {form.images.map((url, i) => (
                <div key={i} className="pd-image-thumb">
                  <img src={url} alt={`Product ${i+1}`}/>
                  <button type="button" className="pd-image-thumb__remove"
                    onClick={() => set('images', form.images.filter((_,idx)=>idx!==i))}>
                    <X size={11}/>
                  </button>
                </div>
              ))}
              <label className={`pd-image-add ${uploading?'pd-image-add--loading':''}`}>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} disabled={uploading}/>
                {uploading ? <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }}/> : <Upload size={18}/>}
                <span>{uploading ? 'Uploading…' : 'Add Images'}</span>
              </label>
            </div>
          </div>

          {/* Basic info */}
          <div className="pd-section">
            <label className="pd-section__title">Basic Information</label>
            <div className="pd-field">
              <label className="input-label">Product Name *</label>
              <input className={`input-field ${errors.name?'pd-input-error':''}`}
                value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Essential Classic Tee"/>
              {errors.name && <p className="pd-error">{errors.name}</p>}
            </div>
            <div className="pd-field">
              <label className="input-label">Description *</label>
              <textarea className={`input-field ${errors.description?'pd-input-error':''}`}
                rows={4} value={form.description}
                onChange={e=>set('description',e.target.value)}
                placeholder="Describe the product quality, fit, and feel…"/>
              {errors.description && <p className="pd-error">{errors.description}</p>}
            </div>
            <div className="pd-field">
              <label className="input-label">Category *</label>
              <select className="input-field" value={form.category} onChange={e=>set('category',e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="pd-section">
            <label className="pd-section__title">Pricing</label>
            <div className="pd-row-3">
              <div className="pd-field">
                <label className="input-label">Price (₦) *</label>
                <input className={`input-field ${errors.price?'pd-input-error':''}`}
                  type="number" min={0} value={form.price}
                  onChange={e=>set('price',e.target.value)} placeholder="4999"/>
                {errors.price && <p className="pd-error">{errors.price}</p>}
              </div>
              <div className="pd-field">
                <label className="input-label">Compare Price (₦)</label>
                <input className="input-field" type="number" min={0}
                  value={form.comparePrice} onChange={e=>set('comparePrice',e.target.value)} placeholder="6499 (optional)"/>
              </div>
            </div>
          </div>

          {/* Colours */}
          <div className="pd-section">
            <label className="pd-section__title">Available Colours *</label>
            {errors.colors && <p className="pd-error">{errors.colors}</p>}
            <div className="pd-color-grid">
              {ALL_COLORS.map(c => (
                <button key={c} type="button"
                  className={`pd-color-btn ${form.colors.includes(c)?'pd-color-btn--active':''}`}
                  onClick={() => toggleArr('colors', c)}
                  title={c}>
                  <span className="pd-color-swatch"
                    style={{ background:COLOR_HEX[c], border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]}` }}/>
                  <span>{c}</span>
                  {form.colors.includes(c) && <CheckCircle size={11} style={{ color:'var(--color-accent)', flexShrink:0 }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Colour-specific images — powers the gallery switch on the
              product page when a shopper picks a colour. Optional: any
              colour left untagged just uses the default images above. */}
          {form.images.length > 0 && (
            <div className="pd-section">
              <label className="pd-section__title">Colour Images (optional)</label>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:-8, marginBottom:10 }}>
                Tag which uploaded photos show each colour. The product page swaps to these automatically when that colour is selected.
              </p>
              {form.colors.map(c => {
                const tagged = form.colorImages?.[c] || [];
                return (
                  <div key={c} style={{ marginBottom:'var(--space-4)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <span className="pd-color-swatch"
                        style={{ background:COLOR_HEX[c], border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]}` }}/>
                      <span style={{ fontSize:'0.8125rem', fontWeight:600, textTransform:'capitalize', color:'var(--text-primary)' }}>{c}</span>
                      <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>({tagged.length} tagged)</span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {form.images.map((url, i) => {
                        const active = tagged.includes(url);
                        return (
                          <button key={i} type="button"
                            onClick={() => {
                              const next = active ? tagged.filter(u => u !== url) : [...tagged, url];
                              set('colorImages', { ...form.colorImages, [c]: next });
                            }}
                            style={{
                              width:52, height:52, borderRadius:'var(--radius-md)', overflow:'hidden', padding:0, cursor:'pointer',
                              border: active ? '2px solid var(--color-accent)' : '2px solid var(--border-color)',
                              opacity: active ? 1 : 0.5,
                            }}>
                            <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sizes */}
          <div className="pd-section">
            <label className="pd-section__title">Available Sizes *</label>
            {errors.sizes && <p className="pd-error">{errors.sizes}</p>}
            <div className="pd-size-row">
              {ALL_SIZES.map(s => (
                <button key={s} type="button"
                  className={`pd-size-btn ${form.sizes.includes(s)?'pd-size-btn--active':''}`}
                  onClick={() => toggleArr('sizes', s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* Pack settings — this is what was missing for "3-in-1"-style
              listings: previously there was no way to say whether a
              multi-shirt pack ships all-one-colour or one-of-each. */}
          <div className="pd-section">
            <label className="pd-section__title">Multi-Shirt Pack</label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom: form.packInfo.isPack ? 'var(--space-3)' : 0 }}>
              <input type="checkbox" checked={form.packInfo.isPack}
                onChange={e => set('packInfo', { ...form.packInfo, isPack: e.target.checked })}/>
              <span style={{ fontSize:'0.8125rem', color:'var(--text-primary)' }}>This listing is a pack of multiple shirts (e.g. "3-in-1")</span>
            </label>
            {form.packInfo.isPack && (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                <div className="pd-row-3">
                  <div className="pd-field">
                    <label className="input-label">Shirts per pack</label>
                    <input className="input-field" type="number" min={2} value={form.packInfo.packSize}
                      onChange={e => set('packInfo', { ...form.packInfo, packSize: Math.max(2, Number(e.target.value)||2) })}/>
                  </div>
                </div>
                <div className="pd-field">
                  <label className="input-label">What's in the pack?</label>
                  <div style={{ display:'flex', gap:'var(--space-3)', marginTop:4 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8125rem', cursor:'pointer' }}>
                      <input type="radio" name="packMode" checked={form.packInfo.packMode==='single-color'}
                        onChange={() => set('packInfo', { ...form.packInfo, packMode:'single-color' })}/>
                      All one colour (customer picks)
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8125rem', cursor:'pointer' }}>
                      <input type="radio" name="packMode" checked={form.packInfo.packMode==='mixed'}
                        onChange={() => set('packInfo', { ...form.packInfo, packMode:'mixed' })}/>
                      Fixed mix of colours
                    </label>
                  </div>
                </div>
                {form.packInfo.packMode === 'mixed' && (
                  <div className="pd-field">
                    <label className="input-label">Which colours are included? (pick exactly {form.packInfo.packSize})</label>
                    {errors.packInfo && <p className="pd-error">{errors.packInfo}</p>}
                    <div className="pd-color-grid">
                      {form.colors.map(c => (
                        <button key={c} type="button"
                          className={`pd-color-btn ${form.packInfo.mixedColors.includes(c)?'pd-color-btn--active':''}`}
                          onClick={() => set('packInfo', {
                            ...form.packInfo,
                            mixedColors: form.packInfo.mixedColors.includes(c)
                              ? form.packInfo.mixedColors.filter(x=>x!==c)
                              : [...form.packInfo.mixedColors, c],
                          })}>
                          <span className="pd-color-swatch" style={{ background:COLOR_HEX[c], border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]}` }}/>
                          <span>{c}</span>
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:6 }}>Pick colours from the palette selected above.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Variant stock grid — replaces the old single flat stock
              number. Each cell is independently trackable so "how many of
              THIS size in THIS colour" is always a real, correct answer
              instead of one shared bucket. */}
          <div className="pd-section">
            <label className="pd-section__title">Stock by {form.packInfo.isPack && form.packInfo.packMode==='mixed' ? 'Size' : 'Size & Colour'}</label>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:-8, marginBottom:10 }}>
              {form.packInfo.isPack
                ? `Each unit here is ${form.packInfo.packSize? 'one pack of '+form.packInfo.packSize:'one pack'} — not one shirt.`
                : 'Set how many units are available in each size/colour combination.'}
            </p>
            <div className="pd-variant-grid">
              <table className="pd-variant-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    {(form.packInfo.isPack && form.packInfo.packMode==='mixed' ? ['Mixed'] : (form.colors.length?form.colors:['—'])).map(c => (
                      <th key={c} style={{ textTransform:'capitalize' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(form.sizes.length?form.sizes:['—']).map(s => (
                    <tr key={s}>
                      <td className="pd-variant-table__size">{s}</td>
                      {(form.packInfo.isPack && form.packInfo.packMode==='mixed' ? ['Mixed'] : (form.colors.length?form.colors:['—'])).map(c => {
                        const size  = s === '—' ? null : s;
                        const color = c === '—' ? null : c;
                        const v = form.variants.find(x => (x.size||null)===size && (x.color||null)===color);
                        return (
                          <td key={c}>
                            <input type="number" min={0} className="pd-variant-input"
                              value={v?.stock ?? 0}
                              onChange={e => setVariantStock(size, color, e.target.value)}/>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize:'0.8125rem', fontWeight:700, color:'var(--text-primary)', marginTop:'var(--space-3)', fontFamily:'var(--font-display)' }}>
              Total stock: {totalStock} unit{totalStock===1?'':'s'}
            </p>
          </div>

          {/* Features */}
          <div className="pd-section">
            <label className="pd-section__title">Key Features</label>
            {form.features.map((f, i) => (
              <div key={i} className="pd-feature-row">
                <input className="input-field" value={f}
                  onChange={e=>updateFeature(i,e.target.value)}
                  placeholder={`e.g. 100% Ring-Spun Cotton`}/>
                <button type="button" className="pd-feature-remove"
                  onClick={() => set('features', form.features.filter((_,idx)=>idx!==i))}>
                  <X size={13}/>
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop:6 }}
              onClick={() => set('features',[...form.features,''])}>
              <Plus size={12}/> Add Feature
            </button>
          </div>

          {/* Tags */}
          <div className="pd-section">
            <label className="pd-section__title">Tags</label>
            <div className="pd-tags">
              {ALL_TAGS.map(t => (
                <button key={t} type="button"
                  className={`pd-tag ${form.tags.includes(t)?'pd-tag--active':''}`}
                  onClick={() => toggleArr('tags',t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="prod-drawer__footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={saving || uploading}>
              {saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </motion.aside>
    </motion.div>
  );
}

// ── Stock Update Modal ────────────────────────────────────────────
function StockModal({ product, onClose, onUpdate }) {
  const dispatch = useDispatch();
  const hasVariants = product.variants?.length > 0;
  const [variants, setVariants] = useState(
    hasVariants ? product.variants.map(v => ({ ...v })) : []
  );
  const [flatStock, setFlatStock] = useState(String(product.stock || 0)); // legacy products with no variants yet
  const [saving, setSaving] = useState(false);

  const updateCell = (size, color, stock) => {
    setVariants(vs => vs.map(v => ((v.size||null)===(size||null) && (v.color||null)===(color||null))
      ? { ...v, stock: Math.max(0, Number(stock)||0) } : v));
  };

  const total = hasVariants ? variants.reduce((s,v)=>s+(Number(v.stock)||0),0) : Number(flatStock)||0;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/products/${product._id}`, hasVariants ? { variants } : { stock: Number(flatStock) });
      dispatch(showToast({ message: 'Stock updated!', type:'success' }));
      onUpdate(data);
    } catch {
      dispatch(showToast({ message: 'Stock update failed', type:'error' }));
    } finally { setSaving(false); }
  };

  // Group variants into a size × colour grid for display
  const sizes  = [...new Set(variants.map(v => v.size))];
  const colors = [...new Set(variants.map(v => v.color))];

  return (
    <div className="prod-modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="prod-modal" style={{ maxWidth: hasVariants ? 480 : 400 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'var(--space-4)', color:'var(--text-primary)' }}>
          Update Stock — {product.name}
        </h3>
        {hasVariants ? (
          <div style={{ marginBottom:'var(--space-4)' }}>
            <div className="pd-variant-grid">
              <table className="pd-variant-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    {colors.map(c => <th key={c||'—'} style={{ textTransform:'capitalize' }}>{c || '—'}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map(s => (
                    <tr key={s||'—'}>
                      <td className="pd-variant-table__size">{s || '—'}</td>
                      {colors.map(c => {
                        const v = variants.find(x => x.size===s && x.color===c);
                        return (
                          <td key={c||'—'}>
                            <input type="number" min={0} className="pd-variant-input"
                              value={v?.stock ?? 0} autoFocus={s===sizes[0]&&c===colors[0]}
                              onChange={e => updateCell(s, c, e.target.value)}/>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize:'0.8125rem', fontWeight:700, marginTop:'var(--space-3)', fontFamily:'var(--font-display)', color:'var(--text-primary)' }}>
              Total: {total} unit{total===1?'':'s'}
            </p>
          </div>
        ) : (
          <div style={{ marginBottom:'var(--space-4)' }}>
            <label className="input-label">New Stock Level</label>
            <input className="input-field" type="number" min={0} value={flatStock}
              onChange={e=>setFlatStock(e.target.value)} autoFocus/>
          </div>
        )}
        <div style={{ display:'flex', gap:'var(--space-3)' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={save} disabled={saving}>
            {saving ? 'Updating…' : 'Update Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminProducts() {
  const dispatch = useDispatch();
  const [products,  setProducts]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('');
  const [page,      setPage]      = useState(1);
  const [drawer,    setDrawer]    = useState(null); // null | 'add' | product-object
  const [stockProd, setStockProd] = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: { search, category, page, limit:12 },
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      dispatch(showToast({ message:'Failed to fetch products', type:'error' }));
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [search, category, page]);

  const handleSave = (savedProduct, isEdit) => {
    if (isEdit) {
      setProducts(ps => ps.map(p => p._id===savedProduct._id ? savedProduct : p));
    } else {
      setProducts(ps => [savedProduct, ...ps]);
      setTotal(t => t+1);
    }
    setDrawer(null);
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      setProducts(ps => ps.filter(p=>p._id!==id));
      setTotal(t=>t-1);
      dispatch(showToast({ message:'Product deleted', type:'success' }));
    } catch {
      dispatch(showToast({ message:'Delete failed', type:'error' }));
    } finally { setDeleting(false); setDeleteId(null); }
  };

  const handleStockUpdate = (updated) => {
    setProducts(ps => ps.map(p=>p._id===updated._id?updated:p));
    setStockProd(null);
  };

  const pages = Math.ceil(total / 12);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Products</h1>
            <p className="admin-page__subtitle">{total} products in catalogue</p>
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => setDrawer('add')}>
            <Plus size={14}/> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-chart-card" style={{ padding:'var(--space-4)' }}>
        <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="input-field" style={{ paddingLeft:'2.5rem', borderRadius:'var(--radius-full)' }}
              placeholder="Search by name….." value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          </div>
          <select className="input-field" style={{ width:'auto', minWidth:160 }}
            value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={fetchProducts}><RefreshCw size={13}/></button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-chart-card">
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding:'var(--space-10)', textAlign:'center', color:'var(--text-muted)' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', margin:'0 auto' }}/>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>
              <Package size={48} style={{ margin:'0 auto var(--space-4)', opacity:0.3 }}/>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>No products found.</p>
              <p style={{ marginTop:4, fontSize:'0.875rem' }}>Try a different search or <button style={{ background:'none',border:'none',cursor:'pointer',color:'var(--color-accent)',fontWeight:600 }} onClick={()=>setDrawer('add')}>add your first product</button>.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name}
                            style={{ width:48, height:48, borderRadius:'var(--radius-md)', objectFit:'cover', background:'var(--bg-secondary)', flexShrink:0 }}/>
                        ) : (
                          <div style={{ width:48, height:48, borderRadius:'var(--radius-md)', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <ImageOff size={16} color="var(--text-muted)"/>
                          </div>
                        )}
                        <div>
                          <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{p.name}</p>
                          <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                            {p.colors?.length||0} colours · {p.sizes?.length||0} sizes
                            {p.tags?.length>0 && ` · ${p.tags.join(', ')}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:'0.875rem', color:'var(--text-secondary)' }}>{p.category}</td>
                    <td>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>
                        ₦{(p.price||0).toLocaleString()}
                      </span>
                      {p.comparePrice && (
                        <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', textDecoration:'line-through', marginLeft:6 }}>
                          ₦{p.comparePrice.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className={`admin-status ${p.stock>50?'admin-status--delivered':p.stock>10?'admin-status--shipped':p.stock>0?'admin-status--processing':'admin-status--pending'}`}
                        style={{ border:'none', cursor:'pointer' }}
                        onClick={() => setStockProd(p)}
                        title="Click to update stock">
                        {p.stock} left
                      </button>
                    </td>
                    <td style={{ fontSize:'0.875rem', color:'#F59E0B' }}>
                      ★ {(p.rating||0).toFixed(1)}
                      <span style={{ color:'var(--text-muted)', marginLeft:4 }}>({p.reviewCount||0})</span>
                    </td>
                    <td>
                      <span className={`admin-status ${p.isActive!==false?'admin-status--delivered':'admin-status--pending'}`}>
                        {p.isActive!==false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'var(--space-1)' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding:6 }}
                          title="Edit product" onClick={() => setDrawer(p)}>
                          <Edit2 size={13}/>
                        </button>
                        {deleteId === p._id ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-sm" style={{ background:'var(--color-error)', color:'#fff', padding:'4px 8px', borderRadius:'var(--radius-md)', fontWeight:700, fontSize:'0.75rem' }}
                              onClick={() => handleDelete(p._id)} disabled={deleting}>
                              {deleting ? '…' : 'Confirm'}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding:'4px 6px' }}
                              onClick={() => setDeleteId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{ padding:6, color:'var(--color-error)' }}
                            title="Delete product" onClick={() => setDeleteId(p._id)}>
                            <Trash2 size={13}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'var(--space-2)', padding:'var(--space-4)', borderTop:'1px solid var(--border-color)' }}>
            <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', alignSelf:'center', color:'var(--text-muted)' }}>
              Page {page} of {pages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawer && (
          <ProductDrawer
            product={drawer === 'add' ? null : drawer}
            onClose={() => setDrawer(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Stock Modal */}
      <AnimatePresence>
        {stockProd && (
          <StockModal product={stockProd} onClose={() => setStockProd(null)} onUpdate={handleStockUpdate}/>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
