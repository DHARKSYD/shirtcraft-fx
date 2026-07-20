// src/pages/ProductDetail.jsx — real API
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, ShirtIcon, ChevronLeft, ChevronRight, Minus, Plus, Shield, Truck, RefreshCw, Star, Package, Info } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductById, fetchProducts, clearCurrent } from '../store/slices/productSlice';
import { addToCart, selectCartItems }   from '../store/slices/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../store/slices/wishlistSlice';
import { showToast }   from '../store/slices/uiSlice';
import ProductCard from '../components/Product/ProductCard';
import './ProductDetail.css';

const COLOR_HEX = { white:'#fff',black:'#111',navy:'#1e3a5f',red:'#FF4F1F',green:'#1a5c38',blue:'#4da6ff',grey:'#9ca3af',gold:'#f59e0b',pink:'#f9a8d4',purple:'#7c3aed' };

export default function ProductDetail() {
  const { id }  = useParams();
  const dispatch = useDispatch();
  const { current: product, list: related, isLoading } = useSelector(s => s.products);
  const isWishlisted = useSelector(selectIsWishlisted(product?._id || id));
  const cartItems = useSelector(selectCartItems);

  const [imgIdx,   setImgIdx]   = useState(0);
  const [selSize,  setSelSize]  = useState('');
  const [selColor, setSelColor] = useState('');
  const [qty,      setQty]      = useState(1);
  const [tab,      setTab]      = useState('description');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const isMixedPack = product?.packInfo?.isPack && product.packInfo.packMode === 'mixed';

  useEffect(() => {
    dispatch(fetchProductById(id));
    return () => dispatch(clearCurrent());
  }, [id]);

  useEffect(() => {
    if (product) {
      // A mixed pack (e.g. a "3-in-1" that ships one of each listed colour)
      // isn't coloured by the customer at all — it's a fixed combination,
      // tracked under its own 'Mixed' variant row. Everything else keeps
      // picking its own colour like before.
      setSelColor(product.packInfo?.isPack && product.packInfo.packMode === 'mixed' ? 'Mixed' : (product.colors?.[0] || ''));
      setSelSize('');
      setImgIdx(0);
      setQty(1);
      // Fetch related products (same category)
      dispatch(fetchProducts({ category: product.category, limit: 4 }));
    }
  }, [product?._id]);

  // Stock for a specific size/colour combination — falls back to the flat
  // `stock` total for products that predate per-size/colour tracking, so
  // older/seeded products don't suddenly look unavailable.
  const getVariantStock = (size, color) => {
    if (!product?.variants || product.variants.length === 0) return product?.stock ?? 0;
    const match = product.variants.find(v => (v.size || null) === (size || null) && (v.color || null) === (color || null));
    return match ? match.stock : 0;
  };

  const availableStock = product ? getVariantStock(selSize, selColor) : 0;

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selSize) { dispatch(showToast({ message:'Please select a size', type:'error' })); return; }
    if (availableStock <= 0) { dispatch(showToast({ message:'This size/colour is out of stock.', type:'error' })); return; }

    const existingQty = cartItems.find(i => i.id === product._id && i.size === selSize && i.color === selColor)?.quantity || 0;
    if (existingQty + qty > availableStock) {
      dispatch(showToast({ message: `Only ${availableStock} in stock — you already have ${existingQty} in your cart.`, type:'error' }));
      return;
    }

    dispatch(addToCart({
      id: product._id, name: product.name, price: product.price,
      image: galleryImages[0] || product.images?.[0], size: selSize, color: selColor,
      quantity: qty, stock: availableStock,
      packInfo: product.packInfo?.isPack ? { packSize: product.packInfo.packSize, packMode: product.packInfo.packMode } : undefined,
    }));
    dispatch(showToast({ message: `${product.name} added to cart!`, type:'success' }));
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) return;
    setSubmitting(true);
    try {
      const { default: api } = await import('../utils/api');
      await api.post(`/products/${product._id}/reviews`, reviewForm);
      dispatch(showToast({ message:'Review submitted!', type:'success' }));
      setReviewForm({ rating:5, comment:'' });
      dispatch(fetchProductById(id));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Review failed', type:'error' }));
    } finally { setSubmitting(false); }
  };

  if (isLoading || !product) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="grid-2" style={{ marginTop:'var(--space-8)' }}>
            <div className="skeleton" style={{ aspectRatio:'4/5', borderRadius:'var(--radius-xl)' }}/>
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              {[60,200,40,100,120,50].map((w,i) => <div key={i} className="skeleton" style={{ height:24, width:`${w}%` }}/>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const discount = product.comparePrice ? Math.round((1-product.price/product.comparePrice)*100) : null;
  const relatedProducts = related.filter(p => p._id !== product._id).slice(0,4);

  // Switch the gallery to the selected colour's own photos when they
  // exist; otherwise fall back to the product's default image set.
  const colorGallery = product.colorImages?.[selColor];
  const galleryImages = (colorGallery && colorGallery.length > 0) ? colorGallery : (product.images || []);

  const pricingClass = "product-detail__pricing";
  return (
    <div className="product-detail">
      <div className="container">
        <div className="product-detail__breadcrumb">
          <Link to="/catalog">Shop</Link> /
          <Link to={`/catalog?category=${product.category}`}>{product.category}</Link> /
          <span>{product.name}</span>
        </div>

        <div className="product-detail__grid">
          {/* Images */}
          <div className="product-detail__images">
            <div className="product-detail__main-img">
              <motion.img key={`${selColor}-${imgIdx}`}
                src={galleryImages[imgIdx] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80'}
                alt={product.name}
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}/>
              {galleryImages.length > 1 && (
                <>
                  <button className="product-detail__img-btn product-detail__img-btn--left"
                    onClick={() => setImgIdx(i => (i>0?i-1:galleryImages.length-1))}>
                    <ChevronLeft size={20}/>
                  </button>
                  <button className="product-detail__img-btn product-detail__img-btn--right"
                    onClick={() => setImgIdx(i => (i<galleryImages.length-1?i+1:0))}>
                    <ChevronRight size={20}/>
                  </button>
                </>
              )}
            </div>
            <div className="product-detail__thumbnails">
              {galleryImages.map((img,i) => (
                <button key={i} className={`product-detail__thumb ${imgIdx===i?'product-detail__thumb--active':''}`} onClick={() => setImgIdx(i)}>
                  <img src={img} alt=""/>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="product-detail__info">
            <p className="eyebrow">{product.category}</p>
            <h1 className="product-detail__title">{product.name}</h1>
            <div className="product-detail__rating">
              <div className="stars">{'★'.repeat(Math.round(product.rating||0))}</div>
              <span>{product.rating || 0} · {product.reviewCount || 0} reviews</span>
            </div>
            <div className={pricingClass}>
              <span className="product-detail__price">₦{product.price?.toLocaleString()}</span>
              {product.comparePrice && <span className="product-detail__compare">₦{product.comparePrice.toLocaleString()}</span>}
              {discount && <span className="badge" style={{ background:'var(--color-accent)', color:'#fff' }}>Save {discount}%</span>}
            </div>

            {/* Pack info banner — this is the "3-in-1, but which colours?"
                clarity that was missing entirely before: every pack now
                states in plain language exactly what you'll receive. */}
            {product.packInfo?.isPack && (
              <div className="product-detail__pack-banner">
                <Package size={16}/>
                <div>
                  <strong>{product.packInfo.packSize}-in-1 pack</strong>
                  {isMixedPack ? (
                    <p>You'll receive {product.packInfo.packSize} shirts — one each in {product.packInfo.mixedColors?.join(', ') || 'a mix of colours'}.</p>
                  ) : (
                    <p>You'll receive {product.packInfo.packSize} shirts, all in the colour you select below.</p>
                  )}
                </div>
              </div>
            )}

            {/* Colour — hidden for mixed packs, since the colour mix is fixed */}
            {isMixedPack ? (
              <div className="product-detail__option">
                <label className="product-detail__option-label">Includes</label>
                <div className="product-detail__colors">
                  {product.packInfo.mixedColors?.map(c => (
                    <span key={c} className="product-detail__color"
                      style={{ background:COLOR_HEX[c]||'#ccc', border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]||'#ccc'}`, cursor:'default' }}
                      title={c}/>
                  ))}
                </div>
              </div>
            ) : product.colors?.length > 0 && (
              <div className="product-detail__option">
                <label className="product-detail__option-label">
                  Colour: <strong>{selColor || '—'}</strong>
                </label>
                <div className="product-detail__colors">
                  {product.colors?.map(c => {
                    const colorOutOfStock = product.sizes?.length > 0
                      ? product.sizes.every(s => getVariantStock(s, c) <= 0)
                      : getVariantStock(null, c) <= 0;
                    return (
                      <button key={c}
                        className={`product-detail__color ${selColor===c?'product-detail__color--active':''}`}
                        style={{ background:COLOR_HEX[c]||'#ccc', border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]||'#ccc'}`, opacity: colorOutOfStock?0.35:1 }}
                        onClick={() => { setSelColor(c); setImgIdx(0); }} title={colorOutOfStock ? `${c} (out of stock)` : c}/>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {product.sizes?.length > 0 && (
              <div className="product-detail__option">
                <label className="product-detail__option-label">Size: {!selSize && <span style={{ color:'var(--color-error)', fontSize:'0.75rem', fontWeight:400 }}>required</span>}</label>
                <div className="product-detail__sizes">
                  {product.sizes?.map(s => {
                    const sizeOutOfStock = getVariantStock(s, selColor) <= 0;
                    return (
                      <button key={s}
                        className={`product-detail__size ${selSize===s?'product-detail__size--active':''} ${sizeOutOfStock?'product-detail__size--disabled':''}`}
                        onClick={() => !sizeOutOfStock && setSelSize(s)}
                        disabled={sizeOutOfStock}
                        title={sizeOutOfStock ? 'Out of stock in this colour' : undefined}>{s}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty + CTA */}
            <div className="product-detail__actions">
              <div className="product-detail__qty">
                <button onClick={() => setQty(q => Math.max(1,q-1))} disabled={availableStock<=0}><Minus size={13}/></button>
                <span>{qty}</span>
                <button onClick={() => setQty(q => Math.min(q+1, availableStock))} disabled={availableStock<=0 || qty>=availableStock}><Plus size={13}/></button>
              </div>
              <button className="btn btn-accent btn-lg" style={{ flex:1 }} onClick={handleAddToCart} disabled={availableStock<=0}>
                {availableStock<=0 ? 'Out of Stock' : <><ShoppingBag size={17}/> Add to Cart</>}
              </button>
              <button className={`btn btn-icon ${isWishlisted?'btn-accent':'btn-outline'}`}
                onClick={() => dispatch(toggleWishlist({ id:product._id, name:product.name, price:product.price, image:product.images?.[0] }))}>
                <Heart size={17} fill={isWishlisted?'currentColor':'none'}/>
              </button>
            </div>

            <Link to="/design-studio" className="product-detail__customize">
              <ShirtIcon size={15}/> Customise this shirt in the Design Studio
            </Link>

            <div className="product-detail__trust">
              {[{icon:<Shield size={13}/>,text:'100% Quality Guarantee'},{icon:<Truck size={13}/>,text:'Fast delivery nationwide'},{icon:<RefreshCw size={13}/>,text:'Easy 30-day returns'}].map(b=>(
                <div key={b.text} className="product-detail__trust-item">{b.icon}{b.text}</div>
              ))}
            </div>
            {availableStock <= 0 ? (
              <p style={{ color:'var(--color-error)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem' }}>
                Out of stock{selSize || (selColor && selColor!=='Mixed') ? ' in this selection' : ''}
              </p>
            ) : availableStock < 10 && (
              <p style={{ color:'var(--color-warning)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem' }}>
                ⚠ Only {availableStock} left{selSize?` in size ${selSize}`:''}{selColor && selColor!=='Mixed'?` / ${selColor}`:''}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="product-detail__tabs">
          <div className="product-detail__tab-nav">
            {['description','reviews'].map(t=>(
              <button key={t} className={`product-detail__tab-btn ${tab===t?'product-detail__tab-btn--active':''}`}
                onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)} {t==='reviews'&&`(${product.reviewCount||0})`}</button>
            ))}
          </div>
          {tab === 'description' ? (
            <div className="product-detail__tab-content">
              <p className="product-detail__desc">{product.description}</p>
              {product.features?.length > 0 && (
                <div className="product-detail__features">
                  {product.features.map(f=><div key={f} className="product-detail__feature"><span>✓</span>{f}</div>)}
                </div>
              )}
            </div>
          ) : (
            <div className="product-detail__tab-content">
              {/* Review form */}
              <div className="review-form" style={{ background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'var(--space-5)', marginBottom:'var(--space-6)' }}>
                <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'var(--space-4)', color:'var(--text-primary)' }}>Write a Review</h4>
                <form onSubmit={handleReview}>
                  <div style={{ marginBottom:'var(--space-3)' }}>
                    <label className="input-label">Rating</label>
                    <div style={{ display:'flex', gap:'var(--space-1)', marginTop:'var(--space-2)' }}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} type="button" onClick={()=>setReviewForm(f=>({...f,rating:n}))}
                          style={{ fontSize:'1.5rem', background:'none', border:'none', cursor:'pointer', color: n<=reviewForm.rating?'#F59E0B':'var(--border-color)', transition:'color 0.15s' }}>★</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:'var(--space-3)' }}>
                    <label className="input-label">Your Comment</label>
                    <textarea className="input-field" rows={3} style={{ marginTop:'var(--space-2)' }}
                      placeholder="Share your experience with this product…"
                      value={reviewForm.comment} onChange={e=>setReviewForm(f=>({...f,comment:e.target.value}))} required/>
                  </div>
                  <button type="submit" className="btn btn-accent btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </div>
              {/* Existing reviews */}
              {product.reviews?.length === 0 ? (
                <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'var(--space-8) 0' }}>No reviews yet. Be the first!</p>
              ) : (
                product.reviews?.map(r=>(
                  <div key={r._id} className="review-card">
                    <div className="review-card__header">
                      <div className="review-card__avatar">{r.name?.[0]}</div>
                      <div>
                        <p className="review-card__user">{r.name}</p>
                        <div className="stars" style={{ fontSize:12 }}>{'★'.repeat(r.rating)}</div>
                      </div>
                      <span className="review-card__date">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="review-card__text">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="product-detail__related">
            <h2 className="section-title">You might also like</h2>
            <div className="grid-4">
              {relatedProducts.map(p=><ProductCard key={p._id} product={p}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
