// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Truck, CheckCircle, ChevronRight, Shield, Lock, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart, selectCartItems, selectCartSubtotal, selectCartTotal, selectCartDiscount } from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';
import { showToast } from '../store/slices/uiSlice';
import api from '../utils/api';
import './Checkout.css';

const STEPS = ['Shipping', 'Payment', 'Review'];

export default function Checkout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const items     = useSelector(selectCartItems);
  const subtotal  = useSelector(selectCartSubtotal);
  const total     = useSelector(selectCartTotal); // subtotal minus discount
  const discount  = useSelector(selectCartDiscount);
  const coupon    = useSelector(s => s.cart.coupon);
  const shipping  = total > 10000 ? 0 : 1500;
  const grandTotal = total + shipping;

  const [step, setStep] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [address, setAddress] = useState({ name:'', street:'', city:'Lagos', state:'Lagos', phone:'' });
  const [payment, setPayment] = useState({ method:'paystack' });

  // A shopper landing here with an empty cart (direct link, refresh after a
  // separate tab cleared it, etc.) has nothing to check out — send them back
  // to their cart instead of letting them fill out a form that can't submit.
  // Checked once on mount only, so this never fires again after a successful
  // order clears the cart out from under this same page.
  useEffect(() => {
    if (items.length === 0) navigate('/cart', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setOrderError(null);
    try {
      // Build the trusted-shape payload the backend expects. Prices are
      // never sent for catalog items — the server always looks those up
      // itself so nothing here can be tampered with client-side.
      const orderItems = items.map(item => (
        item.customDesign
          ? { customDesign: true, name: item.name, price: item.price, image: item.image, size: item.size, color: item.color, quantity: item.quantity }
          : { product: item.id, size: item.size, color: item.color, quantity: item.quantity }
      ));

      const order = await dispatch(createOrder({
        items:         orderItems,
        shipping:      { name: address.name, phone: address.phone, street: address.street, city: address.city, state: address.state, country: 'Nigeria' },
        paymentMethod: payment.method,
        couponCode:    coupon || undefined,
      })).unwrap();

      // Order is safely recorded at this point — everything from here on is
      // just collecting payment for it, so the cart can be cleared now.
      dispatch(clearCart());

      if (payment.method === 'paystack') {
        try {
          const { data } = await api.post('/orders/payment-intent', {
            amount:      Math.round(order.total * 100),
            orderId:     order._id,
            orderNumber: order.orderNumber,
          });
          if (data.authorizationUrl) {
            window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
          }
          dispatch(showToast({ message: 'Order placed! Complete your Paystack payment to confirm it.', type: 'success' }));
        } catch {
          dispatch(showToast({ message: `Order ${order.orderNumber} was placed, but we couldn't open Paystack. You can retry payment from your order history.`, type: 'error' }));
        }
      } else {
        dispatch(showToast({ message: 'Order placed! Check your email for confirmation.', type: 'success' }));
      }

      navigate(`/order-success/${order._id}`);
    } catch (err) {
      setOrderError(typeof err === 'string' ? err : 'Unable to place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-page__header">
        <div className="container">
          <div className="checkout-page__brand">
            <Shield size={18} color="var(--color-success)" />
            <span>Secure Checkout — ShirtCraft</span>
          </div>
        </div>
      </div>

      <div className="container checkout-page__body">
        {/* Stepper */}
        <div className="checkout-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="checkout-stepper__item">
              <div className={`checkout-stepper__dot ${i < step ? 'checkout-stepper__dot--done' : i === step ? 'checkout-stepper__dot--active' : ''}`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`checkout-stepper__label ${i === step ? 'checkout-stepper__label--active' : ''}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`checkout-stepper__line ${i < step ? 'checkout-stepper__line--done' : ''}`} />}
            </div>
          ))}
        </div>

        <div className="checkout-page__layout">
          {/* Form panel */}
          <div className="checkout-form-panel">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="shipping" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                  <h2 className="checkout-form-panel__title"><Truck size={18} /> Shipping Details</h2>
                  <div className="checkout-form">
                    <div className="checkout-form__row">
                      <div>
                        <label className="input-label">Full Name *</label>
                        <input className="input-field" value={address.name} onChange={e=>setAddress(a=>({...a,name:e.target.value}))} placeholder="Your full name" required />
                      </div>
                      <div>
                        <label className="input-label">Phone Number *</label>
                        <input className="input-field" value={address.phone} onChange={e=>setAddress(a=>({...a,phone:e.target.value}))} placeholder="+234 800 000 0000" required />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Street Address *</label>
                      <input className="input-field" value={address.street} onChange={e=>setAddress(a=>({...a,street:e.target.value}))} placeholder="123 Main Street, Apt 4B" required />
                    </div>
                    <div className="checkout-form__row">
                      <div>
                        <label className="input-label">City *</label>
                        <input className="input-field" value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))} required />
                      </div>
                      <div>
                        <label className="input-label">State *</label>
                        <select className="input-field" value={address.state} onChange={e=>setAddress(a=>({...a,state:e.target.value}))}>
                          {['Lagos','Abuja','Kano','Rivers','Oyo','Delta','Edo','Anambra','Enugu','Imo'].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-accent btn-lg" style={{width:'100%'}} onClick={()=>{
                      if(!address.name||!address.street||!address.phone){dispatch(showToast({message:'Please fill all required fields',type:'error'}));return;}
                      setStep(1);
                    }}>
                      Continue to Payment <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="payment" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                  <h2 className="checkout-form-panel__title"><CreditCard size={18} /> Payment Method</h2>

                  {/* Method selector */}
                  <div className="checkout-methods">
                    {[{val:'paystack',label:'Paystack (Card / Bank Transfer / USSD)'},{val:'bank_transfer',label:'Bank Transfer'}].map(m=>(
                      <label key={m.val} className={`checkout-method ${payment.method===m.val?'checkout-method--active':''}`}>
                        <input type="radio" name="method" value={m.val} checked={payment.method===m.val} onChange={()=>setPayment(p=>({...p,method:m.val}))} />
                        {m.label}
                      </label>
                    ))}
                  </div>

                  {payment.method === 'paystack' && (
                    <div className="checkout-transfer-info" style={{marginTop:'var(--space-5)'}}>
                      <p><strong>Paystack</strong> securely processes cards, bank transfers, and USSD payments.</p>
                      <p style={{color:'var(--color-muted)',fontSize:'var(--text-sm)',marginTop:'var(--space-3)'}}>You will be redirected to Paystack to complete your payment securely.</p>
                    </div>
                  )}
                  {payment.method === 'bank_transfer' && (
                    <div className="checkout-transfer-info">
                      <p><strong>Bank:</strong> First Bank Nigeria</p>
                      <p><strong>Account Name:</strong> ShirtCraft Ltd</p>
                      <p><strong>Account Number:</strong> 3012345678</p>
                      <p style={{color:'var(--color-muted)',fontSize:'var(--text-sm)',marginTop:'var(--space-3)'}}>Transfer the exact amount and include your order ID as reference. Orders are confirmed within 2 hours.</p>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:'var(--space-3)', marginTop:'var(--space-5)' }}>
                    <button className="btn btn-outline" onClick={()=>setStep(0)}>← Back</button>
                    <button className="btn btn-accent btn-lg" style={{flex:1}} onClick={()=>setStep(2)}>
                      Review Order <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="review" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
                  <h2 className="checkout-form-panel__title"><CheckCircle size={18} /> Review & Place Order</h2>

                  <div className="checkout-review-section">
                    <h4>Shipping to:</h4>
                    <p>{address.name} · {address.phone}</p>
                    <p>{address.street}, {address.city}, {address.state}</p>
                  </div>
                  <div className="checkout-review-section">
                    <h4>Payment:</h4>
                    <p>{payment.method === 'paystack' ? 'Paystack' : 'Bank Transfer'}</p>
                  </div>

                  {orderError && (
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', background:'rgba(239,68,68,0.08)', color:'var(--color-error)', padding:'var(--space-3) var(--space-4)', borderRadius:'var(--radius-md)', marginTop:'var(--space-4)', fontSize:'var(--text-sm)' }}>
                      <AlertCircle size={16} style={{flexShrink:0, marginTop:2}} />
                      <span>{orderError}</span>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:'var(--space-3)', marginTop:'var(--space-6)' }}>
                    <button className="btn btn-outline" onClick={()=>setStep(1)}>← Back</button>
                    <button className="btn btn-accent btn-lg" style={{flex:1}} onClick={handlePlaceOrder} disabled={placing}>
                      {placing ? (
                        <span style={{display:'flex',alignItems:'center',gap:'var(--space-2)'}}>
                          <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block'}} />
                          Placing Order…
                        </span>
                      ) : (
                        <><Lock size={14} /> Place Order — ₦{grandTotal.toLocaleString()}</>
                      )}
                    </button>
                  </div>
                  <p style={{textAlign:'center',fontSize:'var(--text-xs)',color:'var(--color-muted)',marginTop:'var(--space-3)'}}>
                    <Shield size={12} style={{display:'inline',marginRight:4}} />
                    Your payment is encrypted and secure.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary sidebar */}
          <div className="checkout-summary">
            <div className="checkout-summary__card">
              <h3>Order Summary</h3>
              <div className="checkout-summary__items">
                {items.map(item => (
                  <div key={item.cartKey} className="checkout-summary__item">
                    <div className="checkout-summary__item-img-wrap">
                      <img src={item.image} alt={item.name} />
                      <span className="checkout-summary__item-qty">{item.quantity}</span>
                    </div>
                    <p className="checkout-summary__item-name">{item.name}</p>
                    <p className="checkout-summary__item-price">₦{(item.price*item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="checkout-summary__lines">
                <div className="checkout-summary__line"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                {discount > 0 && (
                  <div className="checkout-summary__line" style={{color:'var(--color-success)'}}>
                    <span>Discount{coupon ? ` (${coupon})` : ''}</span><span>–₦{(subtotal-total).toLocaleString()}</span>
                  </div>
                )}
                <div className="checkout-summary__line"><span>Shipping</span><span>{shipping===0?'Free':`₦${shipping.toLocaleString()}`}</span></div>
                <div className="checkout-summary__line checkout-summary__line--total"><span>Total</span><span>₦{grandTotal.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
