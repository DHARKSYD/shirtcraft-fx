// src/pages/DesignStudio.jsx
// Powered by react-konva — a proper React-first canvas library

import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer, Group } from 'react-konva';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Type, Image, Trash2, Undo2, Redo2, Download, ShoppingCart,
  ShirtIcon, ZoomIn, ZoomOut, RotateCcw, FlipHorizontal2, Copy, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Layers, Plus, Minus, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import { showToast } from '../store/slices/uiSlice';
import { SHIRT_COLORS, SIZES } from '../utils/mockData';
import './DesignStudio.css';

// ── Shirt colours hex map ────────────────────────────────────────
const COLOR_HEX = {
  white:'#FFFFFF',black:'#111111',navy:'#1e3a5f',red:'#FF4F1F',
  green:'#1a5c38',blue:'#4da6ff',grey:'#9ca3af',gold:'#f59e0b',
  pink:'#f9a8d4',purple:'#7c3aed',
};

// ── Shirt SVG paths (used as background image on stage) ──────────
const SHIRT_PATH = `<svg viewBox="0 0 520 560" xmlns="http://www.w3.org/2000/svg">
  <path d="M175 70 L105 140 L35 175 L70 285 L145 245 L145 510 L375 510 L375 245 L450 285 L485 175 L415 140 L345 70 C335 95 310 110 260 110 C210 110 185 95 175 70Z" fill="FILL_COLOR" stroke="rgba(0,0,0,0.09)" stroke-width="2"/>
  <path d="M175 70 C185 92 210 108 260 108 C310 108 335 92 345 70 L320 62 C312 84 290 96 260 96 C230 96 208 84 200 62Z" fill="rgba(0,0,0,0.07)"/>
  <path d="M35 175 L70 285 L145 245 L145 140Z" fill="rgba(0,0,0,0.04)"/>
  <path d="M485 175 L450 285 L375 245 L375 140Z" fill="rgba(0,0,0,0.04)"/>
  <path d="M145 245 L145 510 L260 510 L260 245Z" fill="rgba(0,0,0,0.025)"/>
</svg>`;

function svgToImage(svgString) {
  return new Promise(resolve => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const img  = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.src = url;
  });
}

// ── Panel accordion ─────────────────────────────────────────────
function Panel({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sp">
      <button className="sp__header" onClick={() => setOpen(o => !o)}>
        <span className="sp__title">{icon}{title}</span>
        {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:'hidden'}}>
            <div className="sp__body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

let elementCounter = 0;
const newId = () => `el_${++elementCounter}`;

export default function DesignStudio() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const { isLoggedIn } = useSelector(s => s.auth);

  // ── Stage ref ───────────────────────────────────────────────────
  const stageRef      = useRef(null);
  const transformerRef= useRef(null);

  // ── Design state ────────────────────────────────────────────────
  const [shirtColor,  setShirtColor]  = useState('white');
  const [view,        setView]        = useState('front'); // front | back
  const [elements,    setElements]    = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [history,     setHistory]     = useState([[]]);
  const [histIdx,     setHistIdx]     = useState(0);
  const [shirtImg,    setShirtImg]    = useState(null);
  const [stageSize,   setStageSize]   = useState({ w: 480, h: 520 });

  // ── Text config ─────────────────────────────────────────────────
  const [textValue,   setTextValue]   = useState('Your Text Here');
  const [fontSize,    setFontSize]    = useState(32);
  const [fontFamily,  setFontFamily]  = useState('Space Grotesk');
  const [textColor,   setTextColor]   = useState('#0D0D0D');
  const [bold,        setBold]        = useState(false);
  const [italic,      setItalic]      = useState(false);
  const [textAlign,   setTextAlign]   = useState('center');

  // ── Order options ────────────────────────────────────────────────
  const [selSize,     setSelSize]     = useState('M');
  const [selQty,      setSelQty]      = useState(1);

  const FONTS = ['Space Grotesk','Inter','Georgia','Impact','Arial','Courier New','Verdana','Trebuchet MS'];

  // ── Load shirt SVG whenever color changes ────────────────────────
  useEffect(() => {
    const hex = COLOR_HEX[shirtColor] || '#FFFFFF';
    svgToImage(SHIRT_PATH.replace('FILL_COLOR', hex)).then(setShirtImg);
  }, [shirtColor]);

  // ── Konva transformer ────────────────────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    if (selectedId) {
      const node = stage.findOne('#' + selectedId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, elements]);

  // ── Stage resize ─────────────────────────────────────────────────
  useEffect(() => {
    const wrap = document.querySelector('.studio-canvas-wrap');
    if (!wrap) return;

    const updateStageSize = () => {
      const rect = wrap.getBoundingClientRect();
      const widthFromLayout = rect.width || window.innerWidth * 0.6;
      const w = Math.max(320, Math.min(Math.floor(widthFromLayout - 32), 520));
      const next = { w, h: Math.round(w * (520 / 480)) };
      setStageSize(prev => (prev.w === next.w && prev.h === next.h ? prev : next));
    };

    updateStageSize();
    const timer = window.setTimeout(updateStageSize, 60);
    const obs = new ResizeObserver(() => updateStageSize());
    obs.observe(wrap);
    window.addEventListener('resize', updateStageSize);

    return () => {
      window.clearTimeout(timer);
      obs.disconnect();
      window.removeEventListener('resize', updateStageSize);
    };
  }, []);

  // ── Print area bounds (scaled) ────────────────────────────────────
  const scale   = stageSize.w / 480;
  const printX  = 105 * scale;
  const printY  = 120 * scale;
  const printW  = 270 * scale;
  const printH  = 310 * scale;

  // ── History helpers ───────────────────────────────────────────────
  const pushHistory = useCallback((newEls) => {
    setHistory(h => [...h.slice(0, histIdx + 1), newEls]);
    setHistIdx(i => i + 1);
  }, [histIdx]);

  const undo = () => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setElements(prev);
    setHistIdx(i => i - 1);
    setSelectedId(null);
  };

  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setElements(next);
    setHistIdx(i => i + 1);
    setSelectedId(null);
  };

  // ── Add text ──────────────────────────────────────────────────────
  const addText = () => {
    const el = {
      id:         newId(),
      type:       'text',
      text:       textValue || 'Double-click to edit',
      x:          printX + printW / 2 - 80,
      y:          printY + 40,
      fontSize:   fontSize * scale,
      fontFamily,
      fill:       textColor,
      fontStyle:  `${italic ? 'italic ' : ''}${bold ? 'bold' : 'normal'}`.trim(),
      align:      textAlign,
      draggable:  true,
      width:      200 * scale,
    };
    const next = [...elements, el];
    setElements(next);
    pushHistory(next);
    setSelectedId(el.id);
    dispatch(showToast({ message: 'Text added — drag to reposition', type: 'info' }));
  };

  // ── Upload image ──────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const maxSize = Math.min(printW, printH) * 0.7;
        const ratio   = Math.min(maxSize / img.width, maxSize / img.height);
        const el = {
          id:       newId(),
          type:     'image',
          src:      ev.target.result,
          imgEl:    img,
          x:        printX + (printW - img.width * ratio) / 2,
          y:        printY + 30,
          width:    img.width * ratio,
          height:   img.height * ratio,
          draggable:true,
        };
        const next = [...elements, el];
        setElements(next);
        pushHistory(next);
        setSelectedId(el.id);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Delete selected ───────────────────────────────────────────────
  const deleteSelected = () => {
    if (!selectedId) return;
    const next = elements.filter(el => el.id !== selectedId);
    setElements(next);
    pushHistory(next);
    setSelectedId(null);
  };

  // ── Duplicate selected ────────────────────────────────────────────
  const duplicateSelected = () => {
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    const dup = { ...el, id: newId(), x: el.x + 20, y: el.y + 20 };
    const next = [...elements, dup];
    setElements(next);
    pushHistory(next);
    setSelectedId(dup.id);
  };

  // ── Layer order ────────────────────────────────────────────────────
  const moveLayer = (dir) => {
    const idx = elements.findIndex(e => e.id === selectedId);
    if (idx < 0) return;
    const next = [...elements];
    if (dir === 'up' && idx < next.length - 1)   [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
    if (dir === 'down' && idx > 0)                [next[idx], next[idx-1]] = [next[idx-1], next[idx]];
    setElements(next);
    pushHistory(next);
  };

  // ── Update element properties ─────────────────────────────────────
  const updateEl = (id, props) => {
    const next = elements.map(el => el.id === id ? { ...el, ...props } : el);
    setElements(next);
    pushHistory(next);
  };

  // ── On drag end ────────────────────────────────────────────────────
  const onDragEnd = (e, id) => {
    updateEl(id, { x: e.target.x(), y: e.target.y() });
  };

  // ── On transform end ───────────────────────────────────────────────
  const onTransformEnd = (e, id) => {
    const node = e.target;
    updateEl(id, {
      x:        node.x(),
      y:        node.y(),
      width:    node.width() * node.scaleX(),
      height:   node.height() * node.scaleY(),
      rotation: node.rotation(),
      scaleX:   1,
      scaleY:   1,
    });
  };

  // ── Export design as PNG ───────────────────────────────────────────
  const downloadDesign = () => {
    if (!isLoggedIn) {
      dispatch(showToast({ message: 'Sign in to download your design.', type: 'info' }));
      navigate('/login', { state: { from: { pathname: '/design-studio' } } });
      return;
    }
    setSelectedId(null);
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const a   = document.createElement('a');
      a.href    = uri;
      a.download= `shirtcraft-design-${Date.now()}.png`;
      a.click();
      dispatch(showToast({ message: 'Design saved!', type: 'success' }));
    }, 100);
  };

  // ── Add to cart ────────────────────────────────────────────────────
  const addToCartHandler = () => {
    setSelectedId(null);
    setTimeout(() => {
      const thumbnail = stageRef.current.toDataURL({ pixelRatio: 0.4 });
      dispatch(addToCart({
        id:           'custom-design-' + Date.now(),
        name:         'Custom Designed T-Shirt',
        price:        12999,
        image:        thumbnail,
        size:         selSize,
        color:        shirtColor,
        quantity:     selQty,
        customDesign: true,
      }));
      dispatch(showToast({ message: 'Custom shirt added to cart!', type: 'success' }));
      navigate('/cart');
    }, 100);
  };

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div className="studio">
      {/* ── TOP TOOLBAR ── */}
      <div className="studio-bar">
        <Link to="/" className="studio-bar__back">
          <ArrowLeft size={15}/> Exit
        </Link>
        <div className="studio-bar__brand">
          <ShirtIcon size={15} className="text-accent"/>
          <span>Design Studio</span>
        </div>

        {/* View toggle */}
        <div className="studio-bar__view">
          {['front','back'].map(v => (
            <button key={v} className={`studio-bar__view-btn ${view===v?'active':''}`}
              onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        {/* History */}
        <div className="studio-bar__actions">
          <button className={`studio-bar__btn ${histIdx<=0?'disabled':''}`} onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={15}/>
          </button>
          <button className={`studio-bar__btn ${histIdx>=history.length-1?'disabled':''}`} onClick={redo} title="Redo">
            <Redo2 size={15}/>
          </button>
          {selectedId && (
            <>
              <button className="studio-bar__btn" onClick={duplicateSelected} title="Duplicate"><Copy size={15}/></button>
              <button className="studio-bar__btn studio-bar__btn--delete" onClick={deleteSelected} title="Delete"><Trash2 size={15}/></button>
            </>
          )}
          <div className="studio-bar__sep"/>
          <button className="studio-bar__btn" onClick={downloadDesign} title={isLoggedIn ? 'Download PNG' : 'Sign in to download'}><Download size={15}/></button>
          <button className="btn btn-accent btn-sm" onClick={addToCartHandler}>
            <ShoppingCart size={13}/> Add to Cart
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="studio-body">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="studio-left">

          {/* Shirt colour */}
          <Panel title="Shirt Colour" icon={<span style={{fontSize:14}}>🎨</span>} defaultOpen>
            <div className="sc-color-grid">
              {SHIRT_COLORS.map(c => (
                <button key={c.label}
                  className={`sc-swatch ${shirtColor===c.label?'active':''}`}
                  style={{ background: COLOR_HEX[c.label], border: c.label==='white'?'1.5px solid #e5e7eb':`1.5px solid ${COLOR_HEX[c.label]}` }}
                  onClick={()=>setShirtColor(c.label)} title={c.name}/>
              ))}
            </div>
            <p className="sc-color-label">{SHIRT_COLORS.find(c=>c.label===shirtColor)?.name}</p>
          </Panel>

          {/* Add Text */}
          <Panel title="Add Text" icon={<Type size={13}/>} defaultOpen>
            <textarea className="sc-textarea" rows={2} value={textValue}
              onChange={e=>setTextValue(e.target.value)} placeholder="Enter your text…"/>
            <select className="sc-select" value={fontFamily} onChange={e=>setFontFamily(e.target.value)}>
              {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <div className="sc-row">
              <div className="sc-field">
                <label className="sc-label">Size</label>
                <input type="number" min={8} max={120} className="sc-input-num"
                  value={fontSize} onChange={e=>setFontSize(+e.target.value)}/>
              </div>
              <div className="sc-field">
                <label className="sc-label">Colour</label>
                <input type="color" className="sc-color-pick" value={textColor}
                  onChange={e=>setTextColor(e.target.value)}/>
              </div>
            </div>
            {/* Format row */}
            <div className="sc-fmt-row">
              <button className={`sc-fmt-btn ${bold?'active':''}`} onClick={()=>setBold(!bold)}><Bold size={13}/></button>
              <button className={`sc-fmt-btn ${italic?'active':''}`} onClick={()=>setItalic(!italic)}><Italic size={13}/></button>
              <button className={`sc-fmt-btn ${textAlign==='left'?'active':''}`} onClick={()=>setTextAlign('left')}><AlignLeft size={13}/></button>
              <button className={`sc-fmt-btn ${textAlign==='center'?'active':''}`} onClick={()=>setTextAlign('center')}><AlignCenter size={13}/></button>
              <button className={`sc-fmt-btn ${textAlign==='right'?'active':''}`} onClick={()=>setTextAlign('right')}><AlignRight size={13}/></button>
            </div>
            <button className="btn btn-primary" style={{width:'100%',marginTop:8}} onClick={addText}>
              <Type size={13}/> Add to Design
            </button>
          </Panel>

          {/* Upload image */}
          <Panel title="Upload Image / Logo" icon={<Image size={13}/>} defaultOpen={false}>
            <label className="sc-upload">
              <input type="file" accept="image/*" hidden onChange={handleImageUpload}/>
              <div className="sc-upload__inner">
                <Image size={22} color="var(--text-muted)"/>
                <p>Click to upload</p>
                <p style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>PNG, JPG, SVG · max 5 MB<br/>Use transparent PNG for best logo results</p>
              </div>
            </label>
          </Panel>

          {/* Element properties when selected */}
          {selectedEl && (
            <Panel title="Element" icon={<span style={{fontSize:14}}>⚙️</span>} defaultOpen>
              <div className="sc-el-info">
                <span className="sc-el-type">{selectedEl.type === 'text' ? '📝 Text' : '🖼 Image'}</span>
              </div>
              <div className="sc-row" style={{marginTop:8}}>
                <button className="sc-transform-btn" onClick={()=>moveLayer('up')} title="Bring forward">
                  <ChevronUp size={13}/> Forward
                </button>
                <button className="sc-transform-btn" onClick={()=>moveLayer('down')} title="Send back">
                  <ChevronDown size={13}/> Back
                </button>
              </div>
              {selectedEl.type === 'text' && (
                <>
                  <div className="sc-field" style={{marginTop:8}}>
                    <label className="sc-label">Text colour</label>
                    <input type="color" className="sc-color-pick" value={selectedEl.fill || '#000000'}
                      onChange={e=>updateEl(selectedId,{fill:e.target.value})}/>
                  </div>
                  <div className="sc-field" style={{marginTop:8}}>
                    <label className="sc-label">Font size</label>
                    <input type="number" min={8} max={200} className="sc-input-num"
                      value={Math.round((selectedEl.fontSize||32)/scale)}
                      onChange={e=>updateEl(selectedId,{fontSize:+e.target.value*scale})}/>
                  </div>
                </>
              )}
              <button className="sc-transform-btn sc-transform-btn--delete" style={{marginTop:8,width:'100%'}}
                onClick={deleteSelected}>
                <Trash2 size={13}/> Delete Element
              </button>
            </Panel>
          )}

          {/* Layers */}
          {elements.length > 0 && (
            <Panel title={`Layers (${elements.length})`} icon={<Layers size={13}/>} defaultOpen={false}>
              <div className="sc-layers">
                {[...elements].reverse().map((el, i) => (
                  <div key={el.id}
                    className={`sc-layer ${selectedId===el.id?'sc-layer--active':''}`}
                    onClick={()=>setSelectedId(el.id)}>
                    <span style={{fontSize:12}}>{el.type==='text'?'T':'🖼'}</span>
                    <span className="sc-layer__name" style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {el.type==='text' ? el.text?.slice(0,20) : 'Image'}
                    </span>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:2,display:'flex'}}
                      onClick={e=>{e.stopPropagation();const next=elements.filter(x=>x.id!==el.id);setElements(next);pushHistory(next);setSelectedId(null)}}>
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>

        {/* ── CANVAS AREA ── */}
        <div className="studio-center">
          <div className="studio-canvas-wrap" onClick={e=>{if(e.target===e.currentTarget)setSelectedId(null)}}>
            {shirtImg && (
              <Stage
                ref={stageRef}
                width={stageSize.w}
                height={stageSize.h}
                style={{ display:'block', cursor: selectedId ? 'move' : 'default' }}
                onClick={e=>{ if(e.target===stageRef.current)setSelectedId(null); }}
              >
                {/* Background layer: shirt SVG */}
                <Layer>
                  <KonvaImage image={shirtImg} x={0} y={0} width={stageSize.w} height={stageSize.h}/>

                  {/* Print area guide */}
                  <Rect
                    x={printX} y={printY} width={printW} height={printH}
                    stroke="rgba(255,79,31,0.4)" strokeWidth={1.5}
                    dash={[8,5]} fill="transparent"
                    listening={false}/>
                </Layer>

                {/* Design elements layer */}
                <Layer>
                  {elements.map(el => {
                    if (el.type === 'text') {
                      return (
                        <Text
                          key={el.id}
                          id={el.id}
                          x={el.x} y={el.y}
                          text={el.text}
                          fontSize={el.fontSize}
                          fontFamily={el.fontFamily}
                          fill={el.fill}
                          fontStyle={el.fontStyle}
                          align={el.align}
                          width={el.width}
                          draggable
                          rotation={el.rotation || 0}
                          onClick={()=>setSelectedId(el.id)}
                          onTap={()=>setSelectedId(el.id)}
                          onDragEnd={e=>onDragEnd(e, el.id)}
                          onTransformEnd={e=>onTransformEnd(e, el.id)}
                          onDblClick={e=>{
                            const textNode = e.target;
                            const stage    = stageRef.current;
                            setSelectedId(null);
                            const absPos   = textNode.getAbsolutePosition();
                            const stageBox = stage.container().getBoundingClientRect();
                            const areaPos  = { x: stageBox.left + absPos.x, y: stageBox.top + absPos.y };
                            const ta = document.createElement('textarea');
                            ta.value = el.text;
                            ta.style.cssText = `position:fixed;top:${areaPos.y}px;left:${areaPos.x}px;width:${(el.width||200)+8}px;font-size:${el.fontSize}px;font-family:${el.fontFamily};background:rgba(255,255,255,0.95);border:2px solid #FF4F1F;border-radius:4px;padding:4px;z-index:9999;resize:none;outline:none;`;
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            const cleanup = () => {
                              updateEl(el.id, { text: ta.value });
                              document.body.removeChild(ta);
                            };
                            ta.addEventListener('blur', cleanup);
                            ta.addEventListener('keydown', e=>{ if(e.key==='Escape')cleanup(); });
                          }}
                        />
                      );
                    }
                    if (el.type === 'image') {
                      return (
                        <KonvaImage
                          key={el.id}
                          id={el.id}
                          image={el.imgEl}
                          x={el.x} y={el.y}
                          width={el.width} height={el.height}
                          rotation={el.rotation || 0}
                          draggable
                          onClick={()=>setSelectedId(el.id)}
                          onTap={()=>setSelectedId(el.id)}
                          onDragEnd={e=>onDragEnd(e, el.id)}
                          onTransformEnd={e=>onTransformEnd(e, el.id)}
                        />
                      );
                    }
                    return null;
                  })}
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
                    rotateEnabled
                    keepRatio={false}
                    borderStroke="#FF4F1F"
                    borderStrokeWidth={1.5}
                    anchorStroke="#FF4F1F"
                    anchorFill="#fff"
                    anchorSize={8}
                    anchorCornerRadius={4}
                  />
                </Layer>
              </Stage>
            )}
          </div>

          {/* Canvas hints */}
          <div className="studio-hints">
            <span>🖱 Drag elements to reposition · Click to select · Double-click text to edit in place</span>
            <span style={{color:'rgba(255,79,31,0.8)'}}>Red dashed box = print area</span>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (order) ── */}
        <aside className="studio-right">
          <div className="studio-order">
            <h3 className="studio-order__title">Order Details</h3>

            <div className="studio-order__field">
              <label className="sc-label">Shirt Colour</label>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:COLOR_HEX[shirtColor],border:'1.5px solid var(--border-color)'}}/>
                <span style={{fontFamily:'var(--font-display)',fontSize:'0.875rem',fontWeight:600}}>
                  {SHIRT_COLORS.find(c=>c.label===shirtColor)?.name}
                </span>
              </div>
            </div>

            <div className="studio-order__field">
              <label className="sc-label">Size</label>
              <div className="studio-sizes">
                {SIZES.map(s=>(
                  <button key={s} className={`studio-size-btn ${selSize===s?'active':''}`}
                    onClick={()=>setSelSize(s)}>{s}</button>
                ))}
              </div>
            </div>

            <div className="studio-order__field">
              <label className="sc-label">Quantity</label>
              <div className="studio-qty">
                <button onClick={()=>setSelQty(q=>Math.max(1,q-1))}><Minus size={13}/></button>
                <span>{selQty}</span>
                <button onClick={()=>setSelQty(q=>q+1)}><Plus size={13}/></button>
              </div>
            </div>

            <div className="studio-order__summary">
              <div className="studio-order__row"><span>Base price</span><span>₦12,999</span></div>
              <div className="studio-order__row"><span>Qty</span><span>×{selQty}</span></div>
              <div className="studio-order__row studio-order__row--total">
                <span>Total</span>
                <span>₦{(12999*selQty).toLocaleString()}</span>
              </div>
            </div>

            <button className="btn btn-accent" style={{width:'100%'}} onClick={addToCartHandler}>
              <ShoppingCart size={15}/> Add to Cart
            </button>
            <button className="btn btn-outline" style={{width:'100%',marginTop:8}} onClick={downloadDesign}
              title={isLoggedIn ? undefined : 'Sign in to download'}>
              <Download size={15}/> {isLoggedIn ? 'Save as PNG' : 'Sign in to Save PNG'}
            </button>

            <p className="studio-order__note">
              Custom shirts are produced within 48 hours of design approval.
            </p>
          </div>

          <div className="studio-tips">
            <h4>Tips</h4>
            <ul>
              <li>Use transparent PNG for logos</li>
              <li>Drag the corner handles to resize</li>
              <li>Double-click text to edit</li>
              <li>Add multiple elements and layer them</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
