// src/pages/Dashboard/Wishlist.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist, selectWishlistItems } from '../../store/slices/wishlistSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { showToast } from '../../store/slices/uiSlice';

export default function Wishlist() {
  const dispatch = useDispatch();
  const items    = useSelector(selectWishlistItems);

  const moveToCart = (item) => {
    dispatch(addToCart({ ...item, size: 'M', color: 'black', quantity: 1 }));
    dispatch(toggleWishlist(item));
    dispatch(showToast({ message: 'Moved to cart!', type: 'success' }));
  };

  return (
    <div className="dash-section">
      <h2 className="dash-section__title">My Wishlist <span style={{ color: 'var(--color-muted)', fontWeight: 400, fontSize: 'var(--text-base)' }}>({items.length})</span></h2>

      {items.length === 0 ? (
        <div className="dash-empty">
          <Heart size={48} color="var(--color-border)" />
          <p>Your wishlist is empty.</p>
          <Link to="/catalog" className="btn btn-accent">Browse Products</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                className="wishlist-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
              >
                <button className="wishlist-card__remove" onClick={() => dispatch(toggleWishlist(item))}>
                  <X size={14} />
                </button>
                <Link to={`/products/${item.id}`} className="wishlist-card__img-wrap">
                  <img src={item.image} alt={item.name} className="wishlist-card__img" />
                </Link>
                <div className="wishlist-card__info">
                  <p className="wishlist-card__name">{item.name}</p>
                  <p className="wishlist-card__price">₦{item.price.toLocaleString()}</p>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 'var(--space-3)' }}
                    onClick={() => moveToCart(item)}>
                    <ShoppingBag size={14} /> Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
