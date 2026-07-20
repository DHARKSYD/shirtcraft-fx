// src/components/Product/ProductCard.jsx — works with real MongoDB docs
import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { motion }   from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart }       from '../../store/slices/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../../store/slices/wishlistSlice';
import { showToast }       from '../../store/slices/uiSlice';
import './ProductCard.css';

const fmt = (p) => `₦${Number(p).toLocaleString()}`;

const COLOR_HEX = {
  white:'#fff',black:'#111',navy:'#1e3a5f',red:'#FF4F1F',
  green:'#1a5c38',blue:'#4da6ff',grey:'#9ca3af',gold:'#f59e0b',
  pink:'#f9a8d4',purple:'#7c3aed',
};

export default function ProductCard({ product, layout = 'grid' }) {
  const dispatch   = useDispatch();
  // Support both _id (MongoDB) and id (mock)
  const pid        = product._id || product.id;
  const isWishlisted = useSelector(selectIsWishlisted(pid));
  const [hovering, setHovering]   = useState(false);
  const [imgIdx,   setImgIdx]     = useState(0);
  const [adding,   setAdding]     = useState(false);

  const handleWishlist = (e) => {
    e.preventDefault();
    dispatch(toggleWishlist({ id: pid, name: product.name, price: product.price, image: product.images?.[0] }));
    dispatch(showToast({ message: isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', type:'info' }));
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (product.stock <= 0) {
      dispatch(showToast({ message: 'This product is out of stock.', type: 'error' }));
      return;
    }
    setAdding(true);
    dispatch(addToCart({
      id: pid, name: product.name, price: product.price,
      image: product.images?.[0], size: product.sizes?.[2] || product.sizes?.[0] || 'M',
      color: product.colors?.[0] || 'black', quantity: 1, stock: product.stock,
    }));
    dispatch(showToast({ message: `${product.name} added to cart`, type:'success' }));
    setTimeout(() => setAdding(false), 900);
  };

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100) : null;

  const isList = layout === 'list';

  return (
    <Link to={`/products/${pid}`} className={`product-card ${isList ? 'product-card--list' : ''}`}
      onMouseEnter={() => { setHovering(true); product.images?.length > 1 && setImgIdx(1); }}
      onMouseLeave={() => { setHovering(false); setImgIdx(0); }}>

      <div className="product-card__img-wrap">
        <motion.img key={imgIdx}
          src={product.images?.[imgIdx] || product.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=70'}
          alt={product.name} className="product-card__img"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.25 }} loading="lazy"/>

        <div className="product-card__tags">
          {product.stock <= 0 && <span className="badge" style={{ background:'var(--color-error)', color:'#fff' }}>Out of Stock</span>}
          {product.tags?.includes('bestseller') && <span className="badge badge-accent">Bestseller</span>}
          {product.tags?.includes('new')        && <span className="badge badge-success">New</span>}
          {product.packInfo?.isPack && <span className="badge" style={{ background:'var(--color-black)', color:'#fff' }}>{product.packInfo.packSize}-in-1</span>}
          {discount && <span className="badge" style={{ background:'var(--text-primary)', color:'var(--bg-primary)' }}>–{discount}%</span>}
        </div>

        {!isList && (
          <motion.div className="product-card__actions"
            initial={{ opacity:0, y:8 }} animate={{ opacity: hovering?1:0, y: hovering?0:8 }} transition={{ duration:0.18 }}>
            <button className={`product-card__action-btn ${adding?'product-card__action-btn--added':''}`}
              onClick={handleQuickAdd} aria-label="Add to cart" disabled={product.stock<=0}
              style={product.stock<=0 ? { opacity:0.5, cursor:'not-allowed' } : undefined}>
              <ShoppingBag size={14}/> {adding ? 'Added!' : product.stock<=0 ? 'Sold Out' : 'Quick Add'}
            </button>
            <button className={`product-card__wishlist-btn ${isWishlisted?'product-card__wishlist-btn--active':''}`}
              onClick={handleWishlist} aria-label="Wishlist">
              <Heart size={14} fill={isWishlisted?'currentColor':'none'}/>
            </button>
          </motion.div>
        )}
      </div>

      <div className="product-card__info">
        <p className="product-card__category">{product.category}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__rating">
          <span className="stars">{'★'.repeat(Math.round(product.rating||0))}</span>
          <span className="product-card__rating-count">({product.reviewCount||0})</span>
        </div>
        {isList && product.description && (
          <p className="product-card__desc-preview">{product.description}</p>
        )}
        <div className="product-card__pricing">
          <span className="product-card__price">{fmt(product.price)}</span>
          {product.comparePrice && <span className="product-card__compare">{fmt(product.comparePrice)}</span>}
        </div>
        <div className="product-card__colors">
          {product.colors?.slice(0,5).map(c => (
            <span key={c} className="product-card__color-dot"
              style={{ background: COLOR_HEX[c]||'#ccc', border:c==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c]||'#ccc'}` }}
              title={c}/>
          ))}
          {product.colors?.length > 5 && <span className="product-card__color-more">+{product.colors.length-5}</span>}
        </div>
      </div>

      {isList && (
        <div className="product-card__list-actions">
          <button className={`product-card__action-btn ${adding?'product-card__action-btn--added':''}`}
            onClick={handleQuickAdd} aria-label="Add to cart" disabled={product.stock<=0}
            style={product.stock<=0 ? { opacity:0.5, cursor:'not-allowed' } : undefined}>
            <ShoppingBag size={14}/> {adding ? 'Added!' : product.stock<=0 ? 'Sold Out' : 'Quick Add'}
          </button>
          <button className={`product-card__wishlist-btn ${isWishlisted?'product-card__wishlist-btn--active':''}`}
            onClick={handleWishlist} aria-label="Wishlist">
            <Heart size={14} fill={isWishlisted?'currentColor':'none'}/>
          </button>
        </div>
      )}
    </Link>
  );
}
