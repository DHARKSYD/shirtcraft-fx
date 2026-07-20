// src/pages/OrderSuccess.jsx
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle, Package, ArrowRight, Loader2, CreditCard, ShieldAlert } from 'lucide-react';
import { fetchOrderById, verifyPayment } from '../store/slices/orderSlice';
import { showToast } from '../store/slices/uiSlice';
import api from '../utils/api';

export default function OrderSuccess() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const dispatch = useDispatch();
  const { current: order, isLoading } = useSelector(s => s.orders);

  // Paystack's callback_url (set server-side in createPaymentIntent) sends
  // the paying tab back here with ?reference=... once checkout completes on
  // Paystack's hosted page. Nothing used to happen with that reference —
  // orders just stayed 'pending' forever unless an admin noticed and fixed
  // it by hand. This is what actually closes the loop.
  const [verifyState, setVerifyState] = useState(reference ? 'verifying' : 'idle'); // idle | verifying | failed
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => { dispatch(fetchOrderById(id)); }, [dispatch, id]);

  useEffect(() => {
    if (!reference) return;
    setVerifyState('verifying');
    dispatch(verifyPayment({ orderId: id, reference })).then((result) => {
      if (verifyPayment.fulfilled.match(result)) {
        setVerifyState('idle');
        dispatch(showToast({ message: 'Payment confirmed — thank you!', type: 'success' }));
      } else {
        setVerifyState('failed');
        setVerifyError(result.payload || 'Could not confirm your payment automatically.');
      }
    });
  }, [reference, id, dispatch]);

  const needsPaystackPayment = order && order._id === id && order.paymentMethod === 'paystack' && order.paymentStatus === 'pending' && verifyState !== 'verifying';

  const handlePayNow = async () => {
    try {
      const { data } = await api.post('/orders/payment-intent', {
        amount: Math.round(order.total * 100), orderId: order._id, orderNumber: order.orderNumber,
      });
      if (data.authorizationUrl) window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
    } catch {
      dispatch(showToast({ message: 'Unable to start payment right now. Please try again shortly.', type: 'error' }));
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-surface)', padding:'var(--space-8)' }}>
      <motion.div
        style={{ background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', padding:'var(--space-12)', maxWidth:520, width:'100%', textAlign:'center', display:'flex', flexDirection:'column', gap:'var(--space-5)', alignItems:'center' }}
        initial={{ opacity:0, scale:0.94 }}
        animate={{ opacity:1, scale:1 }}
        transition={{ duration:0.5, ease:'easeOut' }}
      >
        {verifyState === 'verifying' ? (
          <motion.div
            style={{ width:80, height:80, borderRadius:'50%', background:'rgba(255,79,31,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}
            initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.1, type:'spring', stiffness:200 }}>
            <Loader2 size={36} color="var(--color-accent)" style={{ animation:'spin 0.9s linear infinite' }} />
          </motion.div>
        ) : (
          <motion.div
            style={{ width:80, height:80, borderRadius:'50%', background: verifyState==='failed' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}
            initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.2, type:'spring', stiffness:200 }}>
            {verifyState === 'failed'
              ? <ShieldAlert size={40} color="#F59E0B" />
              : <CheckCircle size={40} color="var(--color-success)" />}
          </motion.div>
        )}

        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'var(--space-2)' }}>
            {verifyState === 'verifying' ? 'Confirming Your Payment…' : verifyState === 'failed' ? 'Order Placed' : 'Order Confirmed!'}
          </h1>
          <p style={{ color:'var(--color-muted)', fontSize:'var(--text-base)', lineHeight:1.6 }}>
            {verifyState === 'verifying'
              ? "We're checking with Paystack to confirm your payment went through — this only takes a moment."
              : verifyState === 'failed'
              ? `We couldn't automatically confirm this payment yet (${verifyError}). If you completed checkout on Paystack, this can take a minute — refresh, or contact support if it doesn't resolve.`
              : 'Thank you for your order. A confirmation email has been sent to your inbox.'}
          </p>
        </div>

        <div style={{ background:'var(--color-surface)', borderRadius:'var(--radius-lg)', padding:'var(--space-5)', width:'100%', display:'flex', gap:'var(--space-4)', alignItems:'center' }}>
          <Package size={24} color="var(--color-accent)" />
          <div style={{ textAlign:'left', flex:1 }}>
            {isLoading && !order ? (
              <p style={{ fontSize:'var(--text-sm)', color:'var(--color-muted)', display:'flex', alignItems:'center', gap:6 }}>
                <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> Loading your order…
              </p>
            ) : order ? (
              <>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'var(--text-sm)', color:'var(--color-black)' }}>
                  Order: <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-accent)' }}>{order.orderNumber}</span>
                </p>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-muted)', marginTop:2 }}>
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} · ₦{order.total.toLocaleString()} · {order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                </p>
              </>
            ) : (
              <p style={{ fontSize:'var(--text-xs)', color:'var(--color-muted)' }}>Order ID: <span style={{ fontFamily:'var(--font-mono)' }}>{id}</span></p>
            )}
          </div>
        </div>

        {needsPaystackPayment && (
          <button className="btn btn-accent btn-lg" style={{ width:'100%' }} onClick={handlePayNow}>
            <CreditCard size={16} /> Complete Payment on Paystack
          </button>
        )}
        {verifyState === 'failed' && (
          <button className="btn btn-outline btn-lg" style={{ width:'100%' }} onClick={() => window.location.reload()}>
            Refresh &amp; Check Again
          </button>
        )}

        <div style={{ display:'flex', gap:'var(--space-3)', width:'100%' }}>
          <Link to="/dashboard" className="btn btn-outline" style={{ flex:1 }}>View My Orders</Link>
          <Link to="/catalog" className="btn btn-accent" style={{ flex:1 }}>Continue Shopping <ArrowRight size={14} /></Link>
        </div>
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
