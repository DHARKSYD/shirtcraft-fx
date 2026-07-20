// src/pages/Cart.jsx
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, ShirtIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  removeFromCart, updateQuantity, removeCoupon, validateCoupon,
  selectCartItems, selectCartSubtotal, selectCartTotal, selectCartDiscount, selectCartCouponType,
} from '../store/slices/cartSlice';
import { showToast } from '../store/slices/uiSlice';
import { useState } from 'react';
import './Cart.css';

export default function Cart() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const items      = useSelector(selectCartItems);
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

  const shipping = total > 10000 ? 0 : 1500;
  const grandTotal = total + shipping;

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page__title">Shopping Cart <span>({items.length} item{items.length !== 1 ? 's' : ''})</span></h1>

        {items.length === 0 ? (
          <div className="cart-page__empty">
            <ShoppingBag size={64} color="var(--color-border)" />
            <h2>Your cart is empty</h2>
            <p>Add some products to get started.</p>
            <div style={{ display:'flex', gap:'var(--space-4)' }}>
              <Link to="/catalog" className="btn btn-accent btn-lg">Browse Products</Link>
              <Link to="/design-studio" className="btn btn-outline btn-lg"><ShirtIcon size={16} /> Design Studio</Link>
            </div>
          </div>
        ) : (
          <div className="cart-page__layout">
            {/* Items */}
            <div className="cart-page__items">
              <AnimatePresence>
                {items.map((item, i) => {
                  const atMax = typeof item.stock === 'number' && item.quantity >= item.stock;
                  return (
                  <motion.div key={item.cartKey} className="cart-page__item"
                    layout initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, x:50 }} transition={{ delay: i*0.05 }}>
                    <img src={item.image} alt={item.name} className="cart-page__item-img" />
                    <div className="cart-page__item-info">
                      <p className="cart-page__item-name">{item.name}</p>
                      <p className="cart-page__item-meta">
                        {item.size && `Size: ${item.size}`}
                        {item.customDesign && ' · ✦ Custom Design'}
                      </p>
                      <p className="cart-page__item-price">₦{item.price.toLocaleString()} each</p>
                      {atMax && <p style={{ fontSize:'var(--text-xs)', color:'var(--color-warning)', fontWeight:600, marginTop:4 }}>Only {item.stock} in stock</p>}
                    </div>
                    <div className="cart-page__item-controls">
                      <div className="cart-page__qty">
                        <button onClick={() => handleQtyChange(item, item.quantity-1)}><Minus size={12}/></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleQtyChange(item, item.quantity+1)} disabled={atMax} style={atMax?{opacity:0.4,cursor:'not-allowed'}:undefined}><Plus size={12}/></button>
                      </div>
                      <p className="cart-page__item-subtotal">₦{(item.price*item.quantity).toLocaleString()}</p>
                      <button className="cart-page__remove" onClick={() => dispatch(removeFromCart(item.cartKey))}><Trash2 size={15}/></button>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="cart-page__summary">
              <div className="cart-page__summary-card">
                <h3>Order Summary</h3>

                {/* Coupon */}
                <div className="cart-page__coupon">
                  <Tag size={14} color="var(--color-muted)" />
                  {coupon ? (
                    <div style={{ display:'flex', justifyContent:'space-between', flex:1, fontSize:'var(--text-sm)', color:'var(--color-success)', fontWeight:600 }}>
                      <span>{coupon} (–{couponType==='fixed' ? `₦${discount.toLocaleString()}` : `${discount}%`})</span>
                      <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-muted)' }} onClick={() => dispatch(removeCoupon())}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:'var(--space-2)', flex:1 }}>
                      <input className="input-field" style={{ fontSize:'var(--text-sm)', padding:'8px 12px', flex:1, fontFamily:'var(--font-mono)', textTransform:'uppercase' }}
                        placeholder="Enter coupon code" value={couponInput}
                        onChange={e=>setCouponInput(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&handleCoupon()} />
                      <button className="btn btn-primary btn-sm" onClick={handleCoupon} disabled={isValidatingCoupon}>
                        {isValidatingCoupon ? '…' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="cart-page__summary-lines">
                  <div className="cart-page__summary-line"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                  {discount > 0 && <div className="cart-page__summary-line" style={{color:'var(--color-success)'}}><span>Discount ({couponType==='fixed' ? `₦${discount.toLocaleString()}` : `${discount}%`})</span><span>–₦{(subtotal-total).toLocaleString()}</span></div>}
                  <div className="cart-page__summary-line"><span>Shipping</span><span>{shipping===0 ? <span style={{color:'var(--color-success)',fontWeight:600}}>Free</span> : `₦${shipping.toLocaleString()}`}</span></div>
                  <div className="cart-page__summary-line cart-page__summary-line--total"><span>Grand Total</span><span>₦{grandTotal.toLocaleString()}</span></div>
                </div>

                <button className="btn btn-accent" style={{width:'100%'}} onClick={() => navigate('/checkout')}>
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
                <Link to="/catalog" className="cart-page__continue">← Continue Shopping</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
