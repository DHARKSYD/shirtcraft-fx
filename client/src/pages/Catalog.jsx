// src/pages/Catalog.jsx — real API with debounced search
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown, Grid, LayoutList } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, setFilters, setPage, resetFilters } from '../store/slices/productSlice';
import { CATEGORIES, SHIRT_COLORS, SIZES } from '../utils/mockData';
import ProductCard from '../components/Product/ProductCard';
import './Catalog.css';

const SORT_OPTIONS = [
  { value:'newest',     label:'Newest' },
  { value:'price-asc',  label:'Price: Low to High' },
  { value:'price-desc', label:'Price: High to Low' },
  { value:'rating',     label:'Best Rated' },
  { value:'popular',    label:'Most Popular' },
];

export default function Catalog() {
  const dispatch = useDispatch();
  const { list: products, total, pages, isLoading, filters } = useSelector(s => s.products);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode,    setViewMode]    = useState('grid');
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [selColors,   setSelColors]   = useState([]);
  const [selSizes,    setSelSizes]    = useState([]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => dispatch(setFilters({ search: localSearch })), 400);
    return () => clearTimeout(t);
  }, [localSearch]);

  // Fetch whenever filters change
  useEffect(() => {
    dispatch(fetchProducts(filters));
  }, [dispatch, filters]);

  const toggleColor = (c) => {
    const next = selColors.includes(c) ? selColors.filter(x=>x!==c) : [...selColors,c];
    setSelColors(next);
    dispatch(setFilters({ color: next.join(',') }));
  };

  const toggleSize = (s) => {
    const next = selSizes.includes(s) ? selSizes.filter(x=>x!==s) : [...selSizes,s];
    setSelSizes(next);
    dispatch(setFilters({ size: next.join(',') }));
  };

  const clearAll = () => {
    setLocalSearch(''); setSelColors([]); setSelSizes([]);
    dispatch(resetFilters());
  };

  const activeCount = [filters.category, ...selColors, ...selSizes, filters.maxPrice<100000?'1':''].filter(Boolean).length;

  const FilterPanel = () => (
    <aside className="catalog-filters">
      <div className="catalog-filters__header">
        <h3 className="catalog-filters__title">Filters</h3>
        {activeCount > 0 && <button className="catalog-filters__clear" onClick={clearAll}>Clear all ({activeCount})</button>}
      </div>
      <div className="filter-group">
        <h4 className="filter-group__label">Category</h4>
        <div className="filter-group__options">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={`filter-chip ${filters.category===c.name?'filter-chip--active':''}`}
              onClick={() => dispatch(setFilters({ category: filters.category===c.name?'':c.name }))}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h4 className="filter-group__label">Colour</h4>
        <div className="filter-color-grid">
          {SHIRT_COLORS.map(c => {
            const hx={white:'#fff',black:'#111',navy:'#1e3a5f',red:'#FF4F1F',green:'#1a5c38',blue:'#4da6ff',grey:'#9ca3af',gold:'#f59e0b',pink:'#f9a8d4',purple:'#7c3aed'};
            return (
              <button key={c.label}
                className={`filter-color ${selColors.includes(c.label)?'filter-color--active':''}`}
                style={{ background:hx[c.label]||'#ccc', border:c.label==='white'?'1.5px solid #e5e7eb':`1.5px solid ${hx[c.label]||'#ccc'}` }}
                onClick={() => toggleColor(c.label)} title={c.name}/>
            );
          })}
        </div>
      </div>
      <div className="filter-group">
        <h4 className="filter-group__label">Size</h4>
        <div className="filter-size-row">
          {SIZES.map(s => (
            <button key={s} className={`filter-size ${selSizes.includes(s)?'filter-size--active':''}`}
              onClick={() => toggleSize(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <div className="filter-group__label-row">
          <h4 className="filter-group__label">Max Price</h4>
          <span className="filter-price-val">₦{(filters.maxPrice||100000).toLocaleString()}</span>
        </div>
        <input type="range" min={2000} max={100000} step={1000}
          value={filters.maxPrice||100000}
          onChange={e => dispatch(setFilters({ maxPrice: +e.target.value }))}
          className="filter-range"/>
        <div className="filter-range-labels"><span>₦2,000</span><span>₦100,000</span></div>
      </div>
    </aside>
  );

  return (
    <div className="catalog">
      <div className="catalog-hero">
        <div className="container">
          <p className="eyebrow">Our Collection</p>
          <h1 className="catalog-hero__title">Premium Blank T-Shirts</h1>
          <p className="catalog-hero__sub">{total} styles ready for customisation.</p>
        </div>
      </div>

      <div className="container catalog-body">
        <div className="catalog-controls">
          <div className="catalog-search">
            <Search size={15} className="catalog-search__icon"/>
            <input type="text" placeholder="Search products…" className="catalog-search__input"
              value={localSearch} onChange={e => setLocalSearch(e.target.value)}/>
            {localSearch && (
              <button className="catalog-search__clear" onClick={() => setLocalSearch('')}><X size={13}/></button>
            )}
          </div>
          <button className="btn btn-outline btn-sm hide-desktop" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal size={13}/> Filters {activeCount>0&&`(${activeCount})`}
          </button>
          <div className="catalog-sort">
            <select className="catalog-sort__select" value={filters.sort||'newest'}
              onChange={e => dispatch(setFilters({ sort: e.target.value }))}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="catalog-sort__icon"/>
          </div>
          <div className="catalog-view-toggle">
            <button className={`catalog-view-btn ${viewMode==='grid'?'catalog-view-btn--active':''}`} onClick={() => setViewMode('grid')}><Grid size={15}/></button>
            <button className={`catalog-view-btn ${viewMode==='list'?'catalog-view-btn--active':''}`} onClick={() => setViewMode('list')}><LayoutList size={15}/></button>
          </div>
          <p className="catalog-count">{total} product{total!==1?'s':''}</p>
        </div>

        <div className="catalog-layout">
          <div className="hide-mobile"><FilterPanel/></div>
          <AnimatePresence>
            {filtersOpen && (
              <motion.div className="catalog-filter-drawer hide-desktop"
                initial={{ x:'-100%' }} animate={{ x:0 }} exit={{ x:'-100%' }} transition={{ type:'tween', duration:0.25 }}>
                <div className="catalog-filter-drawer__header">
                  <h3>Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}><X size={20}/></button>
                </div>
                <FilterPanel/>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="catalog-grid-wrap">
            {isLoading ? (
              <div className={viewMode==='grid'?'catalog-grid':'catalog-list'}>
                {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:380, borderRadius:'var(--radius-xl)' }}/>)}
              </div>
            ) : products.length === 0 ? (
              <div className="catalog-empty">
                <p className="catalog-empty__icon">🔍</p>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
                <button className="btn btn-primary" onClick={clearAll}>Clear Filters</button>
              </div>
            ) : (
              <motion.div className={viewMode==='grid'?'catalog-grid':'catalog-list'} layout>
                <AnimatePresence mode="popLayout">
                  {products.map((p,i) => (
                    <motion.div key={p._id} layout
                      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                      exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.3, delay:i*0.04 }}>
                      <ProductCard product={p} layout={viewMode}/>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="catalog-pagination">
                <button className="catalog-pagination__btn catalog-pagination__btn--nav"
                  disabled={(filters.page||1)<=1}
                  onClick={() => { dispatch(setPage(Math.max(1,(filters.page||1)-1))); window.scrollTo({top:0,behavior:'smooth'}); }}>
                  ← Prev
                </button>
                {Array.from({ length: pages }, (_,i) => i+1).map(p => (
                  <button key={p}
                    className={`catalog-pagination__btn ${(filters.page||1)===p?'catalog-pagination__btn--active':''}`}
                    onClick={() => { dispatch(setPage(p)); window.scrollTo({top:0,behavior:'smooth'}); }}>
                    {p}
                  </button>
                ))}
                <button className="catalog-pagination__btn catalog-pagination__btn--nav"
                  disabled={(filters.page||1)>=pages}
                  onClick={() => { dispatch(setPage(Math.min(pages,(filters.page||1)+1))); window.scrollTo({top:0,behavior:'smooth'}); }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
