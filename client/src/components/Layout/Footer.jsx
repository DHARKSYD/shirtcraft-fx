// src/components/Layout/Footer.jsx
import { Link } from 'react-router-dom';
import { ShirtIcon, Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import './Footer.css';

const FOOTER_LINKS = {
  Shop:    [{ label:'All Products', href:'/catalog' },{ label:'Custom Design', href:'/design-studio' },{ label:'Bestsellers', href:'/catalog?sort=popular' },{ label:'New Arrivals', href:'/catalog?sort=newest' }],
  Company: [{ label:'About Us', href:'/info#about' },{ label:'Blog', href:'/info#blog' },{ label:'Careers', href:'/info#careers' },{ label:'Press', href:'/info#press' }],
  Support: [{ label:'Help Center', href:'/info#help' },{ label:'Order Tracking', href:'/info#tracking' },{ label:'Returns & Refunds', href:'/info#returns' },{ label:'Contact Us', href:'/info#contact' }],
  Legal:   [{ label:'Privacy Policy', href:'/info#privacy' },{ label:'Terms of Service', href:'/info#terms' },{ label:'Cookie Policy', href:'/info#cookies' }],
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        {/* Brand */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <div className="footer__logo-icon"><ShirtIcon size={18} /></div>
            ShirtCraft
          </Link>
          <p className="footer__tagline">
            Design custom t-shirts with our professional studio. Premium blanks, pixel-perfect printing.
          </p>
          <div className="footer__social">
            {[{ icon:<Instagram size={18}/>, href:'#' },{ icon:<Twitter size={18}/>, href:'#' },{ icon:<Facebook size={18}/>, href:'#' },{ icon:<Youtube size={18}/>, href:'#' }].map((s,i)=>(
              <a key={i} href={s.href} className="footer__social-link" aria-label="social">{s.icon}</a>
            ))}
          </div>
        </div>

        {/* Links */}
        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col} className="footer__col">
            <h4 className="footer__col-title">{col}</h4>
            <ul className="footer__links">
              {links.map(l => (
                <li key={l.href}><Link to={l.href} className="footer__link">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>© {new Date().getFullYear()} ShirtCraft Nigeria. All rights reserved.</p>
          <div className="footer__payment-badges">
            {['Paystack', 'Visa', 'Mastercard', 'Opay'].map(p => (
              <span key={p} className="footer__payment-badge">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
