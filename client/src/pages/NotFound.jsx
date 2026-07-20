// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'var(--space-8)' }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}>
        <p style={{ fontFamily:'var(--font-mono)', fontSize:'8rem', fontWeight:700, color:'var(--color-border)', lineHeight:1 }}>404</p>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:700, marginBottom:'var(--space-4)' }}>Page not found</h1>
        <p style={{ color:'var(--color-muted)', marginBottom:'var(--space-8)' }}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-accent btn-lg">Go back home</Link>
      </motion.div>
    </div>
  );
}
