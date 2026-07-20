// src/components/UI/Toast.jsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../../store/slices/uiSlice';
import './Toast.css';

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle    size={16} />,
  info:    <Info       size={16} />,
};

export default function Toast() {
  const dispatch = useDispatch();
  const toast    = useSelector(s => s.ui.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(hideToast()), toast.duration || 3500);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className={`toast-container toast-container--${toast.type || 'info'}`}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
        >
          <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dispatch(hideToast())}>
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
