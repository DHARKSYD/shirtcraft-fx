// src/pages/Home.jsx — real API data
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Star, Truck, Shield, RefreshCw, ShirtIcon, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProducts } from '../store/slices/productSlice';
import ProductCard from '../components/Product/ProductCard';
import { SHIRT_COLORS } from '../utils/mockData';
import './Home.css';

function HeroShirt({ color }) {
  return (
    <motion.div className="hero__shirt-wrap"
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
      <svg viewBox="0 0 320 360" className="hero__shirt-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="softShadow"><feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="rgba(0,0,0,0.18)"/></filter></defs>
        <g filter="url(#softShadow)">
          <path d="M100 40 L60 80 L20 100 L40 160 L80 140 L80 320 L240 320 L240 140 L280 160 L300 100 L260 80 L220 40 C210 60 190 70 160 70 C130 70 110 60 100 40Z"
            fill={color} stroke="rgba(0,0,0,0.08)" strokeWidth="1.5"/>
          <path d="M100 40 C110 56 130 68 160 68 C190 68 210 56 220 40 L200 34 C194 50 178 60 160 60 C142 60 126 50 120 34Z" fill="rgba(0,0,0,0.07)"/>
          <path d="M100 40 L60 80 L20 100 L40 160 L80 140 L80 80Z" fill={color} stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
          <path d="M220 40 L260 80 L300 100 L280 160 L240 140 L240 80Z" fill={color} stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
          <circle cx="160" cy="180" r="28" fill="rgba(255,79,31,0.18)"/>
          <text x="160" y="185" textAnchor="middle" fill="rgba(255,79,31,0.8)" fontSize="12" fontFamily="Space Grotesk" fontWeight="700">SC</text>
          <path d="M80 140 L80 320 L160 320 L160 140Z" fill="rgba(0,0,0,0.04)"/>
        </g>
      </svg>
    </motion.div>
  );
}

function StatCounter({ end, suffix = '', label }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(t); }
      else setCount(Math.floor(start));
    }, 24);
    return () => clearInterval(t);
  }, [end]);
  return (
    <div className="stat">
      <span className="stat__number">{count.toLocaleString()}{suffix}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

// Rotating hero messaging. The shirt + colour picker on the right stays
// put across slides — only the pitch on the left rotates.
const HERO_SLIDES = [
  {
    eyebrow: 'Professional Custom Apparel',
    title: <>Wear Your<br/><span className="hero__title-accent">Story.</span></>,
    subtitle: 'Design custom t-shirts with our professional studio. Premium blanks, pixel-perfect printing, delivery to your door.',
    primary: { label: 'Start Designing', to: '/design-studio', icon: true },
    secondary: { label: 'Browse Collection', to: '/catalog' },
  },
  {
    eyebrow: 'Every Colour, Instantly',
    title: <>Pick a Shade,<br/><span className="hero__title-accent">See It Live.</span></>,
    subtitle: 'Try any colour on the shirt to the right \u2014 what you see in the studio is what gets printed.',
    primary: { label: 'Start Designing', to: '/design-studio', icon: true },
    secondary: { label: 'Browse Collection', to: '/catalog' },
  },
  {
    eyebrow: 'Delivery You Can Track',
    title: <>From Screen to<br/><span className="hero__title-accent">Your Doorstep.</span></>,
    subtitle: 'Every order ships with our own driver network and a live GPS tracking link \u2014 not just a "shipped" email.',
    primary: { label: 'Browse Collection', to: '/catalog' },
    secondary: { label: 'How Tracking Works', to: '/info#tracking' },
  },
  {
    eyebrow: 'Built for Nigerian Businesses',
    title: <>Bulk Orders,<br/><span className="hero__title-accent">Fast Turnaround.</span></>,
    subtitle: 'Branded apparel for teams, events, and businesses \u2014 secure checkout with Paystack, delivered nationwide.',
    primary: { label: 'Start Designing', to: '/design-studio', icon: true },
    secondary: { label: 'Browse Collection', to: '/catalog' },
  },
];

export default function Home() {
  const dispatch = useDispatch();
  const { featured, isLoading } = useSelector(s => s.products);
  const [activeColor, setActiveColor] = useState(SHIRT_COLORS[0]);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => { dispatch(fetchFeaturedProducts()); }, [dispatch]);

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(i => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="container hero__container">
          <div className="hero__content">
            <AnimatePresence mode="wait">
              <motion.div key={activeSlide}
                initial={{ opacity:0, x:-24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:24 }}
                transition={{ duration:0.5, ease:'easeOut' }}>
                <p className="eyebrow">{slide.eyebrow}</p>
                <h1 className="hero__title">{slide.title}</h1>
                <p className="hero__subtitle">{slide.subtitle}</p>
                <div className="hero__cta">
                  <Link to={slide.primary.to} className="btn btn-accent btn-lg">
                    {slide.primary.icon && <ShirtIcon size={18}/>} {slide.primary.label}
                  </Link>
                  <Link to={slide.secondary.to} className="btn btn-outline btn-lg">{slide.secondary.label}</Link>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="hero__slide-dots" role="tablist" aria-label="Hero slides">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} role="tab" aria-selected={i === activeSlide}
                  aria-label={`Show slide ${i + 1}`}
                  className={`hero__slide-dot ${i === activeSlide ? 'hero__slide-dot--active' : ''}`}
                  onClick={() => setActiveSlide(i)}/>
              ))}
            </div>

            <div className="hero__colorpick">
              <p className="hero__colorpick-label">Try a colour:</p>
              <div className="hero__colors">
                {SHIRT_COLORS.slice(0,6).map(c => (
                  <button key={c.hex}
                    className={`hero__color-swatch ${activeColor.hex === c.hex ? 'hero__color-swatch--active':''}`}
                    style={{ background:c.hex, border: c.hex==='#FFFFFF'?'1.5px solid #e5e7eb':`1.5px solid ${c.hex}` }}
                    onClick={() => setActiveColor(c)} title={c.name}/>
                ))}
              </div>
              <span className="hero__color-name">{activeColor.name}</span>
            </div>
          </div>
          <motion.div className="hero__visual"
            initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.7, delay:0.2 }}>
            <div className="hero__shirt-bg"/>
            <HeroShirt color={activeColor.hex}/>
            <motion.div className="hero__badge" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.8 }}>
              <Sparkles size={14} className="hero__badge-icon"/> <span>Premium DTG Print</span>
            </motion.div>
            <motion.div className="hero__badge hero__badge--bottom" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:1 }}>
              <Star size={12} fill="#F59E0B" color="#F59E0B"/> <span>4.9 · 5,000+ reviews</span>
            </motion.div>
          </motion.div>
        </div>
        <motion.div className="hero__scroll" animate={{ y:[0,8,0] }} transition={{ duration:1.5, repeat:Infinity }}>
          <div className="hero__scroll-dot"/>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-bar__grid">
            <StatCounter end={50000} suffix="+" label="Shirts Printed"/>
            <div className="stats-bar__divider"/>
            <StatCounter end={5200} suffix="+" label="Happy Customers"/>
            <div className="stats-bar__divider"/>
            <StatCounter end={98} suffix="%" label="Satisfaction Rate"/>
            <div className="stats-bar__divider"/>
            <StatCounter end={48} suffix="h" label="Avg. Production Time"/>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features">
        <div className="container">
          <div className="features__header">
            <p className="eyebrow">Why ShirtCraft</p>
            <h2 className="section-title">Crafted for quality,<br/>built for scale.</h2>
          </div>
          <div className="features__grid">
            {[
              { icon:<ShirtIcon/>, title:'Professional Studio', desc:'Our react-konva editor gives you full creative control — text, logos, layers, and more.' },
              { icon:<Star/>,  title:'Premium Blanks',      desc:'We stock only the finest blanks — 180GSM to 300GSM, ring-spun cotton, Supima, and organic.' },
              { icon:<Truck/>, title:'Fast Delivery',       desc:'Production in 24–48h. Tracked shipping nationwide with real-time status updates.' },
              { icon:<Shield/>,title:'Quality Guarantee',   desc:'100% satisfaction guaranteed. If your order is not perfect, we remake it.' },
            ].map((f, i) => (
              <motion.div key={i} className="feature-card"
                initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.1 }}>
                <div className="feature-card__icon">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products from DB */}
      <section className="section products-section">
        <div className="container">
          <div className="products-section__header flex-between">
            <div>
              <p className="eyebrow">Top Sellers</p>
              <h2 className="section-title">Bestselling Blanks</h2>
            </div>
            <Link to="/catalog" className="btn btn-ghost">View All <ChevronRight size={16}/></Link>
          </div>
          {isLoading ? (
            <div className="grid-4">
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:380, borderRadius:'var(--radius-xl)' }}/>)}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid-4">
              {featured.slice(0,4).map((p, i) => (
                <motion.div key={p._id} initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
                  viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.08 }}>
                  <ProductCard product={p}/>
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'var(--space-16) 0', color:'var(--text-muted)' }}>
              <p>No featured products yet. <Link to="/catalog" style={{ color:'var(--color-accent)' }}>Browse all products</Link></p>
            </div>
          )}
        </div>
      </section>

      {/* Studio CTA */}
      <section className="studio-cta">
        <div className="container">
          <motion.div className="studio-cta__card"
            initial={{ opacity:0, scale:0.97 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <div className="studio-cta__content">
              <p className="eyebrow" style={{ color:'#FF7A54' }}>Free to Use</p>
              <h2 className="studio-cta__title">Your design.<br/>Your rules.</h2>
              <p className="studio-cta__subtitle">
                Upload logos, add custom text, choose fonts and colours — all in our professional design studio. No software to download.
              </p>
              <div className="studio-cta__actions">
                <Link to="/design-studio" className="btn btn-accent btn-lg"><ShirtIcon size={18}/> Open Design Studio</Link>
                <Link to="/catalog" className="btn" style={{ color:'rgba(255,255,255,0.7)' }}>Or browse blanks <ArrowRight size={16}/></Link>
              </div>
            </div>
            <div className="studio-cta__visual" aria-hidden>
              {['#FF4F1F','#1e3a5f','#FFFFFF'].map((c,i) => (
                <div key={i} className="studio-cta__shirt" style={{ '--shift':`${i*20}px`, '--delay':`${i*0.3}s` }}>
                  <svg viewBox="0 0 160 180" fill="none">
                    <path d="M50 20 L30 40 L10 50 L20 80 L40 70 L40 160 L120 160 L120 70 L140 80 L150 50 L130 40 L110 20 C104 30 86 36 80 36 C74 36 56 30 50 20Z"
                      fill={c} stroke={c==='#FFFFFF'?'#e5e7eb':'transparent'} strokeWidth="1"/>
                  </svg>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials" style={{ background:'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'var(--space-12)' }}>
            <p className="eyebrow">Customer Love</p>
            <h2 className="section-title">What our customers say.</h2>
          </div>
          <div className="grid-3">
            {[
              { name:'Adaobi Chukwu',  role:'Event Organiser', text:'Ordered 200 custom tees for our conference. Every single one was perfect. The quality and turnaround blew us away.', rating:5 },
              { name:'Emeka Okonkwo',  role:'Brand Manager',   text:'The design studio is genuinely impressive. I could recreate our exact brand identity without any professional design skills.', rating:5 },
              { name:'Chisom Nwosu',   role:'Small Business',  text:'Best custom shirt platform I have used. The fabrics are premium, the prints are crisp, and customer service is excellent.', rating:5 },
            ].map((t,i) => (
              <motion.div key={i} className="testimonial-card"
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.1 }}>
                <div className="stars">{'★'.repeat(t.rating)}</div>
                <p className="testimonial-card__text">"{t.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">{t.name[0]}</div>
                  <div>
                    <p className="testimonial-card__name">{t.name}</p>
                    <p className="testimonial-card__role">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta__inner">
            <h2 className="final-cta__title">Ready to create?</h2>
            <p className="final-cta__sub">Join 5,000+ customers who trust ShirtCraft.</p>
            <div className="flex-center gap-4">
              <Link to="/register" className="btn btn-accent btn-lg">Create Free Account</Link>
              <Link to="/catalog"  className="btn btn-outline btn-lg">Browse Products</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
