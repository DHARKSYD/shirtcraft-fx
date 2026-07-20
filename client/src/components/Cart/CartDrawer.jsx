// src/components/Cart/CartDrawer.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  closeCart, removeFromCart, updateQuantity, removeCoupon, validateCoupon,
  selectCartItems, selectCartCount, selectCartSubtotal, selectCartTotal, selectCartDiscount, selectCartCouponType,
} from '../../store/slices/cartSlice';
import { showToast } from '../../store/slices/uiSlice';
import { useState } from 'react';
import './CartDrawer.css';

export default function CartDrawer() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const isOpen     = useSelector(s => s.cart.isOpen);
  const items      = useSelector(selectCartItems);
  const count      = useSelector(selectCartCount);
  const subtotal   = useSelector(selectCartSubtotal);
  const total      = useSelector(selectCartTotal);
  const discount   = useSelector(selectCartDiscount);
  const couponType = useSelector(selectCartCouponType);
  const coupon     = useSelector(s => s.cart.coupon);
  const isValidatingCoupon = useSelector(s => s.cart.isValidatingCoupon);
  const [couponInput, setCouponInput] = useState('');

  const handleCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    dispatch(validateCoupon(code))
      .unwrap()
      .then(() => dispatch(showToast({ message: `Coupon ${code} applied!`, type: 'success' })))
      .catch((message) => dispatch(showToast({ message, type: 'error' })));
    setCouponInput('');
  };

  const handleQtyChange = (item, nextQty) => {
    if (typeof item.stock === 'number' && nextQty > item.stock) {
      dispatch(showToast({ message: `Only ${item.stock} in stock.`, type: 'error' }));
      return;
    }
    dispatch(updateQuantity({ cartKey: item.cartKey, quantity: nextQty }));
  };

  const checkout = () => {
    dispatch(closeCart());
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closeCart())}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="cart-drawer__header">
              <div className="cart-drawer__title">
                <ShoppingBag size={18} />
                <span>Your Cart</span>
                {count > 0 && <span className="cart-drawer__count">{count}</span>}
              </div>
              <button className="cart-drawer__close" onClick={() => dispatch(closeCart())}>
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="cart-drawer__items">
              {items.length === 0 ? (
                <div className="cart-drawer__empty">
                  <ShoppingBag size={48} color="var(--color-border)" />
                  <p>Your cart is empty</p>
                  <Link to="/catalog" className="btn btn-primary" onClick={() => dispatch(closeCart())}>
                    Browse Products
                  </Link>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <motion.div
                      key={item.cartKey}
                      className="cart-item"
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <div className="cart-item__img-wrap">
                        <img src={item.image} alt={item.name} className="cart-item__img" />
                      </div>
                      <div className="cart-item__info">
                        <p className="cart-item__name">{item.name}</p>
                        <p className="cart-item__meta">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.customDesign && <span className="cart-item__custom">✦ Custom Design</span>}
                        </p>
                        <p className="cart-item__price">₦{item.price.toLocaleString()}</p>
                        <div className="cart-item__controls">
                          <div className="cart-item__qty">
                            <button onClick={() => handleQtyChange(item, item.quantity - 1)}>
                              <Minus size={12} />
                            </button>
                            <span>{item.quantity}</span>
                            <button onClick={() => handleQtyChange(item, item.quantity + 1)}
                              disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                              style={typeof item.stock === 'number' && item.quantity >= item.stock ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            className="cart-item__remove"
                            onClick={() => dispatch(removeFromCart(item.cartKey))}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="cart-item__subtotal">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="cart-drawer__footer">
                {/* Coupon */}
                <div className="cart-coupon">
                  <Tag size={14} />
                  {coupon ? (
                    <div className="cart-coupon__applied">
                      <span>Coupon: <strong>{coupon}</strong> (–{couponType === 'fixed' ? `₦${discount.toLocaleString()}` : `${discount}%`})</span>
                      <button onClick={() => dispatch(removeCoupon())}><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="cart-coupon__input">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCoupon()}
                      />
                      <button onClick={handleCoupon} disabled={isValidatingCoupon}>{isValidatingCoupon ? '…' : 'Apply'}</button>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="cart-summary">
                  <div className="cart-summary__row">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="cart-summary__row cart-summary__row--discount">
                      <span>Discount ({couponType === 'fixed' ? `₦${discount.toLocaleString()}` : `${discount}%`})</span>
                      <span>–₦{(subtotal - total).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="cart-summary__row cart-summary__row--shipping">
                    <span>Shipping</span>
                    <span className="cart-summary__free">Calculated at checkout</span>
                  </div>
                  <div className="cart-summary__row cart-summary__row--total">
                    <span>Total</span>
                    <span>₦{total.toLocaleString()}</span>
                  </div>
                </div>

                <button className="btn btn-accent" style={{ width: '100%' }} onClick={checkout}>
                  Checkout <ArrowRight size={16} />
                </button>
                <Link
                  to="/cart"
                  className="cart-drawer__view-cart"
                  onClick={() => dispatch(closeCart())}
                >
                  View full cart
                </Link>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
