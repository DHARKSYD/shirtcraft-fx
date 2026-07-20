// src/pages/InfoPage.jsx — one page covering everything the footer links to,
// each link landing on its own section rather than a dead route.
import { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Truck, RotateCcw, Mail, HelpCircle } from 'lucide-react';
import './InfoPage.css';

const SECTIONS = [
  {
    id: 'about', title: 'About Us',
    body: `ShirtCraft is a Nigerian custom-apparel studio built around one idea: you shouldn't need a 50-piece minimum order or a WhatsApp back-and-forth just to get a shirt printed the way you actually want it. Design it yourself in our studio, see it before you pay, and check out securely with Paystack.`,
  },
  {
    id: 'blog', title: 'Blog',
    body: `Our blog is on the way — design inspiration, print-care tips, and behind-the-scenes from the studio. In the meantime, follow the links in the footer for updates.`,
  },
  {
    id: 'careers', title: 'Careers',
    body: `We're a small, fast-moving team. If you're interested in joining ShirtCraft — on the product, design, or delivery side — reach out via the Contact section below with a short note about what you'd like to work on.`,
  },
  {
    id: 'press', title: 'Press',
    body: `For media or partnership inquiries, get in touch through the Contact section below and we'll get back to you.`,
  },
  {
    id: 'help', title: 'Help Center',
    icon: HelpCircle,
    faqs: [
      ['How long does a custom order take?', 'Most orders are printed and dispatched within 2–4 business days of payment confirmation.'],
      ['Can I change my design after ordering?', 'Not once an order is placed, since production starts right away — double-check your design preview before checkout.'],
      ['Which payment methods do you accept?', 'Card, bank transfer, and USSD, all processed securely through Paystack.'],
      ['Do you deliver nationwide?', 'Yes — delivery is available across Nigeria, with live tracking in supported cities.'],
    ],
  },
  {
    id: 'tracking', title: 'Order Tracking',
    icon: Truck,
    body: `Once your order is picked up by a driver, you'll get a live tracking link by email. You can also find every order — with its current status — from your account dashboard at any time.`,
    cta: { label: 'View My Orders', to: '/dashboard' },
  },
  {
    id: 'returns', title: 'Returns & Refunds',
    icon: RotateCcw,
    body: `Because every item is custom-printed, we can't accept returns for a change of mind. If your order arrives damaged, misprinted, or different from what you ordered, contact us within 7 days with a photo and your order number, and we'll arrange a reprint or refund.`,
  },
  {
    id: 'contact', title: 'Contact Us',
    icon: Mail,
    body: `We're happy to help with orders, bulk pricing, or anything else.`,
    cta: { label: 'Email hello@shirtcraft.ng', to: 'mailto:hello@shirtcraft.ng', external: true },
  },
  {
    id: 'privacy', title: 'Privacy Policy',
    body: `We collect only what's needed to process your order and run your account: contact and shipping details, order history, and payment confirmation from Paystack (we never see or store your card details). We don't sell your data. You can request a copy or deletion of your data at any time by contacting us.`,
  },
  {
    id: 'terms', title: 'Terms of Service',
    body: `By ordering from ShirtCraft you agree to provide accurate order and shipping details, that custom designs you upload don't infringe on anyone else's rights, and that prices are in Nigerian Naira and confirmed at checkout. We reserve the right to decline any order, including designs that are illegal, hateful, or infringe on copyright.`,
  },
  {
    id: 'cookies', title: 'Cookie Policy',
    body: `ShirtCraft uses essential cookies and local storage to keep you signed in and remember your cart. We don't use third-party advertising trackers.`,
  },
];

export default function InfoPage() {
  const { hash } = useLocation();
  const refs = useRef({});

  useEffect(() => {
    if (!hash) { window.scrollTo({ top: 0 }); return; }
    const el = refs.current[hash.slice(1)];
    if (el) {
      // Wait a tick for layout so the offset is accurate
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [hash]);

  return (
    <div className="info-page">
      <div className="container">
        <div className="info-page__header">
          <h1>Company &amp; Support</h1>
          <p>Quick answers on ShirtCraft — jump to any section from the footer, or browse below.</p>
        </div>

        <nav className="info-page__nav">
          {SECTIONS.map(s => (
            <Link key={s.id} to={`/info#${s.id}`} className="info-page__nav-link">{s.title}</Link>
          ))}
        </nav>

        <div className="info-page__sections">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <section key={s.id} id={s.id} ref={el => (refs.current[s.id] = el)} className="info-section">
                <h2>{Icon && <Icon size={18} className="info-section__icon"/>} {s.title}</h2>
                {s.body && <p>{s.body}</p>}
                {s.faqs && (
                  <div className="info-section__faqs">
                    {s.faqs.map(([q, a]) => (
                      <div key={q} className="info-section__faq">
                        <p className="info-section__faq-q">{q}</p>
                        <p className="info-section__faq-a">{a}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.cta && (
                  s.cta.external
                    ? <a href={s.cta.to} className="btn btn-outline info-section__cta">{s.cta.label}</a>
                    : <Link to={s.cta.to} className="btn btn-outline info-section__cta">{s.cta.label}</Link>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
