// src/utils/mockData.js
// Shared UI config constants (colours, sizes, category labels).
// NOTE: this file previously also held full mock product/order/coupon/analytics
// datasets left over from before the app was wired to the real API. Those have
// been removed now that every page fetches real data from the backend.

export const SHIRT_COLORS = [
  { name: 'Classic White',  hex: '#FFFFFF', label: 'white' },
  { name: 'Midnight Black', hex: '#0D0D0D', label: 'black' },
  { name: 'Ocean Navy',     hex: '#1e3a5f', label: 'navy' },
  { name: 'Flame Red',      hex: '#FF4F1F', label: 'red' },
  { name: 'Forest Green',   hex: '#1a5c38', label: 'green' },
  { name: 'Sky Blue',       hex: '#4da6ff', label: 'blue' },
  { name: 'Ash Grey',       hex: '#9ca3af', label: 'grey' },
  { name: 'Sunset Gold',    hex: '#f59e0b', label: 'gold' },
  { name: 'Soft Pink',      hex: '#f9a8d4', label: 'pink' },
  { name: 'Royal Purple',   hex: '#7c3aed', label: 'purple' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const CATEGORIES = [
  { id: 'c1', name: 'Classic Tees',    slug: 'classic'    },
  { id: 'c2', name: 'Premium Fitted',  slug: 'premium'    },
  { id: 'c3', name: 'Oversized',       slug: 'oversized'  },
  { id: 'c4', name: 'Polo Shirts',     slug: 'polo'       },
  { id: 'c5', name: 'Long Sleeve',     slug: 'longsleeve' },
  { id: 'c6', name: 'V-Neck',          slug: 'vneck'      },
];
