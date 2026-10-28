import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ── Icons (inline SVG helpers) ───────────────────────────────── */
const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  upload:   'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  copy:     ['M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z'],
  trash:    'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  zap:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  shield:   ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'],
  cpu:      ['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'],
  check:    'M20 6L9 17l-5-5',
  image:    ['M21 15l-5-5L5 20', 'M3 9l4-4 4 4', 'M14 3h7v7'],
  sparkle:  ['M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7'],
  sliders:  ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  palette:  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z',
  eye:      ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  compare:  ['M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4', 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4', 'M12 3v18'],
  history:  ['M12 8v4l3 3', 'M3.05 11a9 9 0 1 0 .5-4'],
  reset:    'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15',
  keyboard: ['M20 5H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2z', 'M8 11h.01M12 11h.01M16 11h.01M8 15h8'],
  warning:  'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
};

/* ── Toast Component ─────────────────────────────────────────── */
function Toast({ message, type = 'success', onHide }) {
  const [hiding, setHiding] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2400);
    const t2 = setTimeout(onHide, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onHide]);

  return (
    <div className="toast-wrap">
      <div className={`toast toast-${type}${hiding ? ' hiding' : ''}`}>
        <Icon d={type === 'error' ? ICONS.warning : ICONS.check} size={14} style={{ color: type === 'error' ? '#f87171' : '#4ade80' }} />
        {message}
      </div>
    </div>
  );
}

/* ── Comparison Slider ───────────────────────────────────────── */
function CompareSlider({ originalSrc, resultSrc }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragging = useRef(false);

  // Track container width so the original image always fills the full width
  // even though it lives inside a narrower clip div
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const move = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  const onMouseDown = (e) => { e.preventDefault(); dragging.current = true; };
  const onMouseMove = (e) => { if (dragging.current) move(e.clientX); };
  const onMouseUp   = () => { dragging.current = false; };
  const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };

  return (
    <div
      ref={containerRef}
      className="compare-slider"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
    >
      {/* Result image — full container, sits beneath */}
      <img src={resultSrc} alt="Result" className="compare-img" />

      {/* Clip reveals original on the left — the image MUST be full container
          width or it scales to the clip's narrower width and misaligns */}
      <div
        className="compare-original-clip"
        style={{ width: `${pos}%` }}
      >
        <img
          src={originalSrc}
          alt="Original"
          className="compare-img"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
        />
      </div>

      {/* Drag handle */}
      <div className="compare-divider" style={{ left: `${pos}%` }}>
        <div className="compare-handle">
          <Icon d="M8 5l-5 7 5 7M16 5l5 7-5 7" size={16} stroke="#fff" />
        </div>
      </div>

      <span className="compare-label compare-label-left">Original</span>
      <span className="compare-label compare-label-right">Removed BG</span>
    </div>
  );
}

/* ── History Thumbnail ───────────────────────────────────────── */
function HistoryItem({ item, onRestore, onDelete }) {
  return (
    <div className="history-item" title={item.name}>
      <div className="history-thumb checker-bg">
        <img src={item.resultUrl} alt={item.name} />
      </div>
      <div className="history-info">
        <p className="history-name">{item.name}</p>
        <p className="history-time">{item.time}</p>
      </div>
      <div className="history-actions">
        <button className="btn-icon" title="Restore" onClick={() => onRestore(item)}>
          <Icon d={ICONS.reset} size={13} />
        </button>
        <button className="btn-icon" title="Delete" onClick={() => onDelete(item.id)}>
          <Icon d={ICONS.trash} size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Keyboard Shortcut Modal ─────────────────────────────────── */
function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const shortcuts = [
    { key: 'Ctrl+V', desc: 'Paste image from clipboard' },
    { key: 'D',      desc: 'Download result' },
    { key: 'C',      desc: 'Copy result to clipboard' },
    { key: 'R',      desc: 'Reset / New image' },
    { key: 'Tab',    desc: 'Toggle compare slider' },
    { key: '?',      desc: 'Show this help' },
    { key: 'Esc',    desc: 'Close modal' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <Icon d={ICONS.keyboard} size={18} style={{ color: '#a78bfa' }} />
          <h3>Keyboard Shortcuts</h3>
          <button className="btn-icon modal-close" onClick={onClose}>
            <Icon d="M18 6L6 18M6 6l12 12" size={14} />
          </button>
        </div>
        <div className="shortcut-list">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="shortcut-row">
              <kbd className="shortcut-key">{key}</kbd>
              <span className="shortcut-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Batch Queue Item ────────────────────────────────────────── */
function QueueItem({ item, onDownload }) {
  return (
    <div className={`queue-item queue-item-${item.status}`}>
      <div className="queue-thumb checker-bg">
        {item.resultUrl
          ? <img src={item.resultUrl} alt={item.name} />
          : item.status === 'processing'
            ? <div className="spinner-sm" />
            : <div className="queue-pending-icon"><Icon d={ICONS.image[0]} size={18} /></div>
        }
      </div>
      <div className="queue-info">
        <p className="queue-name" title={item.name}>{item.name}</p>
        <p className={`queue-status-text status-${item.status}`}>
          {item.status === 'done'       ? 'Done ✓'
           : item.status === 'processing' ? 'Processing…'
           : item.status === 'error'      ? 'Error'
           : 'Queued'}
        </p>
      </div>
      {item.status === 'done' && (
        <button className="btn-icon" title="Download" onClick={() => onDownload(item)}>
          <Icon d={ICONS.download} size={13} />
        </button>
      )}
    </div>
  );
}

/* ── Color background presets ────────────────────────────────── */
const BG_PRESETS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'White',       value: '#ffffff' },
  { label: 'Black',       value: '#000000' },
  { label: 'Slate',       value: '#1e293b' },
  { label: 'Red',         value: '#dc2626' },
  { label: 'Blue',        value: '#2563eb' },
  { label: 'Green',       value: '#16a34a' },
  { label: 'Gradient 1',  value: 'grad:linear-gradient(135deg,#8b5cf6,#06b6d4)' },
  { label: 'Gradient 2',  value: 'grad:linear-gradient(135deg,#f97316,#ec4899)' },
  { label: 'Gradient 3',  value: 'grad:linear-gradient(135deg,#10b981,#3b82f6)' },
];

/* ── Main App ────────────────────────────────────────────────── */
export default function App() {
  /* Core state */
  const [status, setStatus]               = useState('idle');
  const [progressInfo, setProgressInfo]   = useState('Initializing…');
  const [progressPct, setProgressPct]     = useState(0);
  const [imageSrc, setImageSrc]           = useState(null);
  const [resultSrc, setResultSrc]         = useState(null);
  const [isDragOver, setIsDragOver]       = useState(false);
  const [toast, setToast]                 = useState(null);

  /* New feature state */
  const [activeTab, setActiveTab]         = useState('single');
  const [viewMode, setViewMode]           = useState('side');
  const [bgColor, setBgColor]             = useState('transparent');
  const [customColor, setCustomColor]     = useState('#8b5cf6');
  const [exportFormat, setExportFormat]   = useState('png');
  const [exportQuality, setExportQuality] = useState(95);
  const [history, setHistory]             = useState([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [batchQueue, setBatchQueue]       = useState([]);
  const [composedSrc, setComposedSrc]     = useState(null);

  /* Refs */
  const workerRef             = useRef(null);
  const resultBlobRef         = useRef(null);
  const fileNameRef           = useRef('image');
  const batchRunning          = useRef(false);
  const pendingBatchResolvers = useRef({});
  const currentImageSrcRef    = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  /* ── Worker setup ──────────────────────────────────────────── */
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { status: s, data, jobId } = e.data;

      if (s === 'loading') {
        setStatus('loading'); setProgressInfo(data); setProgressPct(5);
      } else if (s === 'progress') {
        setStatus('loading');
        setProgressInfo(`Downloading model… ${Math.round(data.progress || 0)}%`);
        setProgressPct(Math.round(data.progress || 0));
      } else if (s === 'processing') {
        if (!jobId) { setStatus('processing'); setProgressInfo(data); setProgressPct(0); }
      } else if (s === 'ready') {
        setStatus('ready'); setProgressInfo('Ready'); setProgressPct(100);
      } else if (s === 'complete') {
        if (jobId) {
          handleBatchResult(jobId, data);
        } else {
          setStatus('ready'); setProgressInfo('Done!');
          resultBlobRef.current = data;
          const url = URL.createObjectURL(data);
          setResultSrc(url);
          showToast('Background removed!');
          addToHistory(data, fileNameRef.current, currentImageSrcRef.current);
        }
      } else if (s === 'error') {
        if (jobId) { handleBatchError(jobId, data); }
        else { setStatus('error'); setProgressInfo(data); showToast(data, 'error'); }
      }
    };

    workerRef.current.postMessage({ type: 'LOAD_MODEL' });
    return () => workerRef.current.terminate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Compose result with background ───────────────────────── */
  useEffect(() => {
    if (!resultBlobRef.current) { setComposedSrc(null); return; }
    const bg = bgColor === 'custom' ? customColor : bgColor;
    composeWithBackground(resultBlobRef.current, bg).then(url => setComposedSrc(url));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgColor, customColor, resultSrc]);

  async function composeWithBackground(blob, bg) {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (bg !== 'transparent') {
      if (bg.startsWith('grad:')) {
        const gradStr = bg.slice(5);
        const match = gradStr.match(/linear-gradient\(([^,]+),\s*([^,]+),\s*(.+)\)/);
        if (match) {
          const deg = (parseFloat(match[1]) - 90) * Math.PI / 180;
          const w = bitmap.width, h = bitmap.height;
          const x1 = w / 2 - Math.cos(deg) * w / 2;
          const y1 = h / 2 - Math.sin(deg) * h / 2;
          const x2 = w / 2 + Math.cos(deg) * w / 2;
          const y2 = h / 2 + Math.sin(deg) * h / 2;
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, match[2].trim());
          grad.addColorStop(1, match[3].trim());
          ctx.fillStyle = grad;
        }
      } else {
        ctx.fillStyle = bg;
      }
      ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    const mime = exportFormat === 'jpg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
    const quality = exportFormat === 'png' ? 1 : exportQuality / 100;
    const outBlob = await canvas.convertToBlob({ type: mime, quality });
    return URL.createObjectURL(outBlob);
  }

  /* ── History ───────────────────────────────────────────────── */
  function addToHistory(blob, name, origSrc) {
    const url = URL.createObjectURL(blob);
    const entry = {
      id: Date.now(),
      name,
      resultUrl: url,
      origSrc,
      blob,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory(prev => [entry, ...prev].slice(0, 10));
  }

  const restoreFromHistory = (item) => {
    setImageSrc(item.origSrc);
    currentImageSrcRef.current = item.origSrc;
    resultBlobRef.current = item.blob;
    setResultSrc(URL.createObjectURL(item.blob));
    fileNameRef.current = item.name;
    setStatus('ready');
    setActiveTab('single');
    setShowHistory(false);
    showToast('Restored from history');
  };

  const deleteFromHistory = (id) => setHistory(prev => prev.filter(h => h.id !== id));

  /* ── File processing ───────────────────────────────────────── */
  const processImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please drop an image file.', 'error');
      return;
    }
    fileNameRef.current = file.name.replace(/\.[^.]+$/, '') || 'image';
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      currentImageSrcRef.current = base64;
      setImageSrc(base64);
      setResultSrc(null);
      setComposedSrc(null);
      resultBlobRef.current = null;
      setStatus('processing');
      setProgressInfo('Analysing image…');
      workerRef.current.postMessage({ type: 'RUN_INFERENCE', data: base64 });
    };
    reader.readAsDataURL(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Batch processing ──────────────────────────────────────── */
  const addToBatch = useCallback((files) => {
    const newItems = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: `${Date.now()}-${Math.random()}-${f.name}`,
        name: f.name.replace(/\.[^.]+$/, ''),
        file: f,
        status: 'queued',
        resultUrl: null,
        blob: null,
      }));
    setBatchQueue(prev => {
      const updated = [...prev, ...newItems];
      if (!batchRunning.current) { runBatchQueue(newItems); }
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runBatchQueue = async (items) => {
    batchRunning.current = true;
    for (const item of items) {
      await new Promise((resolve) => {
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));
        const reader = new FileReader();
        reader.onload = (ev) => {
          workerRef.current.postMessage({ type: 'RUN_INFERENCE', data: ev.target.result, jobId: item.id });
          pendingBatchResolvers.current[item.id] = resolve;
        };
        reader.readAsDataURL(item.file);
      });
    }
    batchRunning.current = false;
  };

  const handleBatchResult = (jobId, blob) => {
    const url = URL.createObjectURL(blob);
    setBatchQueue(prev => prev.map(q => q.id === jobId ? { ...q, status: 'done', resultUrl: url, blob } : q));
    if (pendingBatchResolvers.current[jobId]) {
      pendingBatchResolvers.current[jobId]();
      delete pendingBatchResolvers.current[jobId];
    }
  };

  const handleBatchError = (jobId, msg) => {
    setBatchQueue(prev => prev.map(q => q.id === jobId ? { ...q, status: 'error', error: msg } : q));
    if (pendingBatchResolvers.current[jobId]) {
      pendingBatchResolvers.current[jobId]();
      delete pendingBatchResolvers.current[jobId];
    }
  };

  const downloadBatchItem = async (item) => {
    const bg = bgColor === 'custom' ? customColor : bgColor;
    const url = await composeWithBackground(item.blob, bg);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}_no_bg.${exportFormat}`;
    a.click();
  };

  const downloadAllBatch = async () => {
    const done = batchQueue.filter(q => q.status === 'done');
    for (const item of done) await downloadBatchItem(item);
    showToast(`Downloaded ${done.length} image${done.length !== 1 ? 's' : ''}!`);
  };

  /* ── Drag events ───────────────────────────────────────────── */
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = ()  => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (activeTab === 'batch') addToBatch(files);
    else processImage(files?.[0]);
  };
  const handleFileSelect = (e) => {
    if (activeTab === 'batch') addToBatch(e.target.files);
    else processImage(e.target.files?.[0]);
    e.target.value = '';
  };

  /* ── Clipboard paste ───────────────────────────────────────── */
  useEffect(() => {
    const handler = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          processImage(item.getAsFile()); break;
        }
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [processImage]);

  /* ── Keyboard shortcuts ────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'd' && resultBlobRef.current) { e.preventDefault(); handleDownload(); }
      if (e.key === 'c' && resultBlobRef.current) { e.preventDefault(); handleCopyToClipboard(); }
      if (e.key === 'r') { e.preventDefault(); handleReset(); }
      if (e.key === 'Tab') { e.preventDefault(); setViewMode(v => v === 'side' ? 'compare' : 'side'); }
      if (e.key === '?') setShowShortcuts(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Actions ───────────────────────────────────────────────── */
  const handleDownload = async () => {
    if (!resultBlobRef.current) return;
    const bg = bgColor === 'custom' ? customColor : bgColor;
    const url = await composeWithBackground(resultBlobRef.current, bg);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameRef.current}_no_bg.${exportFormat}`;
    a.click();
    showToast('Image downloaded!');
  };

  const handleCopyToClipboard = async () => {
    if (!resultBlobRef.current) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': resultBlobRef.current })]);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Copy not supported in this browser.', 'error');
    }
  };

  const handleReset = () => {
    setImageSrc(null); setResultSrc(null); setComposedSrc(null);
    resultBlobRef.current = null; currentImageSrcRef.current = null;
    if (status !== 'loading' && status !== 'processing') {
      setStatus(workerRef.current ? 'ready' : 'idle');
    }
  };

  /* ── Status pill helper ────────────────────────────────────── */
  const pillText = {
    idle:       'Idle',
    loading:    progressInfo,
    processing: 'Processing…',
    ready:      'Model Ready',
    error:      'Error',
  }[status] || progressInfo;

  const isLoading = status === 'loading' || status === 'processing';
  const displaySrc = composedSrc || resultSrc;

  /* ── Batch progress summary ─────────────────────────────────── */
  const batchDone  = batchQueue.filter(q => q.status === 'done').length;
  const batchTotal = batchQueue.length;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="bg-animated" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <main className="app-wrapper">
        {/* ── Header ────────────────────────────────────────── */}
        <header className="header">
          <div className="badge">
            <span className="badge-dot" />
            AI-Powered · 100% Client-Side · Zero Uploads
          </div>
          <h1 className="app-title">BG Eraser AI</h1>
          <p className="app-subtitle">
            Remove image backgrounds instantly in your browser. No servers, no API keys, no data leaves your device.
          </p>
        </header>

        {/* ── Main Card ─────────────────────────────────────── */}
        <div className="main-card">

          {/* Status Bar */}
          <div className="status-bar" role="status" aria-live="polite">
            <span className="status-label">
              <Icon d={ICONS.cpu} size={14} />
              Model Status
            </span>
            {isLoading && (
              <div className="progress-bar-wrap visible" style={{ flex: 1, maxWidth: 220 }}>
                <div className="progress-bar-fill" style={{ width: status === 'processing' ? '60%' : `${progressPct}%` }} />
              </div>
            )}
            <span className={`status-pill ${status}`}>{pillText}</span>
            <button className="btn-icon shortcut-hint" title="Keyboard shortcuts (?)" onClick={() => setShowShortcuts(true)}>
              <Icon d={ICONS.keyboard} size={14} />
            </button>
          </div>

          {/* Feature chips */}
          <div className="features-row">
            {[
              { icon: ICONS.zap,     label: 'WebGPU Accelerated' },
              { icon: ICONS.shield,  label: 'Privacy First' },
              { icon: ICONS.sparkle, label: 'RMBG-1.4 Model' },
              { icon: ICONS.compare, label: 'Compare Slider' },
              { icon: ICONS.palette, label: 'BG Replace' },
            ].map(({ icon, label }) => (
              <div key={label} className="feature-chip">
                <Icon d={icon} size={13} />
                {label}
              </div>
            ))}
          </div>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="tabs">
            <button className={`tab-btn${activeTab === 'single' ? ' active' : ''}`} onClick={() => setActiveTab('single')}>
              <Icon d={ICONS.image[0]} size={14} />
              Single Image
            </button>
            <button className={`tab-btn${activeTab === 'batch' ? ' active' : ''}`} onClick={() => setActiveTab('batch')}>
              <Icon d={ICONS.sliders[0]} size={14} />
              Batch {batchTotal > 0 ? `(${batchDone}/${batchTotal})` : ''}
            </button>
            {history.length > 0 && (
              <button className={`tab-btn${showHistory ? ' active' : ''}`} onClick={() => { setShowHistory(h => !h); setActiveTab('single'); }}>
                <Icon d={ICONS.history[0]} size={14} />
                History ({history.length})
              </button>
            )}
          </div>

          {/* ── History Panel ─────────────────────────────────── */}
          {showHistory && (
            <div className="history-panel">
              <div className="history-header">
                <span className="panel-label">
                  <span className="dot" style={{ background: '#a78bfa' }} />
                  Recent Results
                </span>
                <button className="btn-icon" title="Clear history" onClick={() => { setHistory([]); setShowHistory(false); }}>
                  <Icon d={ICONS.trash} size={13} />
                </button>
              </div>
              <div className="history-list">
                {history.map(item => (
                  <HistoryItem key={item.id} item={item} onRestore={restoreFromHistory} onDelete={deleteFromHistory} />
                ))}
              </div>
            </div>
          )}

          {/* ── Dropzone ──────────────────────────────────────── */}
          {!showHistory && (
            <div
              id="dropzone"
              className={`dropzone${isDragOver ? ' drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              aria-label="Drop image or click to browse"
              tabIndex={0}
            >
              <input
                type="file"
                id="file-input"
                accept="image/*"
                multiple={activeTab === 'batch'}
                onChange={handleFileSelect}
                aria-label="Select image file"
              />
              <div className="dropzone-icon">
                <Icon d={ICONS.upload} size={28} style={{ color: '#a78bfa' }} />
              </div>
              <p className="dropzone-title">
                {isDragOver
                  ? 'Release to remove background'
                  : activeTab === 'batch' ? 'Drop multiple images here' : 'Drop your image here'}
              </p>
              <p className="dropzone-sub">
                {activeTab === 'batch' ? 'or click to select multiple files' : 'or click to browse · Ctrl+V to paste'}
              </p>
              <div className="dropzone-formats">
                {['PNG', 'JPG', 'WEBP', 'AVIF', 'GIF'].map(f => (
                  <span key={f} className="format-tag">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Batch Queue Panel ─────────────────────────────── */}
          {activeTab === 'batch' && batchQueue.length > 0 && (
            <div className="batch-panel">
              <div className="batch-header">
                <span className="panel-label">
                  <span className="dot" style={{ background: '#a78bfa' }} />
                  Queue — {batchDone}/{batchTotal} done
                </span>
                <div className="panel-actions">
                  {batchDone > 0 && (
                    <button className="btn-secondary btn-sm" onClick={downloadAllBatch}>
                      <Icon d={ICONS.download} size={13} /> Download All
                    </button>
                  )}
                  <button className="btn-icon" title="Clear queue" onClick={() => setBatchQueue([])}>
                    <Icon d={ICONS.trash} size={13} />
                  </button>
                </div>
              </div>
              <div className="batch-list">
                {batchQueue.map(item => (
                  <QueueItem key={item.id} item={item} onDownload={downloadBatchItem} />
                ))}
              </div>
            </div>
          )}

          {/* ── Single Image Results ──────────────────────────── */}
          {activeTab === 'single' && !showHistory && imageSrc && (
            <>
              {/* Toolbar: view mode + BG picker + export format */}
              {resultSrc && (
                <div className="result-toolbar">
                  {/* View */}
                  <div className="toolbar-group">
                    <span className="toolbar-label"><Icon d={ICONS.eye[0]} size={13} /> View</span>
                    <div className="segmented">
                      <button className={`seg-btn${viewMode === 'side' ? ' active' : ''}`} onClick={() => setViewMode('side')}>
                        <Icon d={ICONS.compare[0]} size={13} /> Side
                      </button>
                      <button className={`seg-btn${viewMode === 'compare' ? ' active' : ''}`} onClick={() => setViewMode('compare')}>
                        <Icon d={ICONS.sliders[0]} size={13} /> Slider
                      </button>
                    </div>
                  </div>

                  {/* Background */}
                  <div className="toolbar-group">
                    <span className="toolbar-label"><Icon d={ICONS.palette} size={13} /> Background</span>
                    <div className="bg-presets">
                      {BG_PRESETS.map(p => (
                        <button
                          key={p.value}
                          className={`bg-preset-btn${bgColor === p.value ? ' active' : ''}`}
                          title={p.label}
                          onClick={() => setBgColor(p.value)}
                          style={{
                            background: p.value.startsWith('grad:') ? p.value.slice(5)
                              : p.value === 'transparent' ? 'none' : p.value,
                            border: p.value === 'transparent' ? '1px dashed rgba(139,92,246,0.5)' : undefined,
                          }}
                        >
                          {p.value === 'transparent' && <span className="transparent-label">∅</span>}
                        </button>
                      ))}
                      {/* Custom color picker */}
                      <label
                        className={`bg-preset-btn custom-color-btn${bgColor === 'custom' ? ' active' : ''}`}
                        title="Custom color"
                        style={{ background: customColor }}
                      >
                        <input
                          type="color"
                          value={customColor}
                          onChange={e => { setCustomColor(e.target.value); setBgColor('custom'); }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Export format */}
                  <div className="toolbar-group">
                    <span className="toolbar-label"><Icon d={ICONS.download} size={13} /> Export</span>
                    <div className="segmented">
                      {['png', 'jpg', 'webp'].map(fmt => (
                        <button
                          key={fmt}
                          className={`seg-btn${exportFormat === fmt ? ' active' : ''}`}
                          onClick={() => setExportFormat(fmt)}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {exportFormat !== 'png' && (
                      <div className="quality-row">
                        <span className="quality-label">Q: {exportQuality}%</span>
                        <input
                          type="range" min={50} max={100} step={5}
                          value={exportQuality}
                          onChange={e => setExportQuality(Number(e.target.value))}
                          className="quality-slider"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Images */}
              {viewMode === 'compare' && resultSrc ? (
                <div style={{ marginBottom: '1.25rem' }}>
                  <CompareSlider originalSrc={imageSrc} resultSrc={displaySrc || resultSrc} />
                </div>
              ) : (
                <div className="result-grid" aria-label="Image results">
                  {/* Original */}
                  <div className="image-panel">
                    <div className="panel-header">
                      <span className="panel-label">
                        <span className="dot" style={{ background: '#6b7fa8' }} />
                        Original
                      </span>
                      <div className="panel-actions">
                        <button className="btn-icon" title="Remove image" onClick={handleReset} aria-label="Remove image">
                          <Icon d={ICONS.trash} size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="panel-img-wrap">
                      <img src={imageSrc} alt="Original uploaded image" />
                    </div>
                  </div>

                  {/* Result */}
                  <div className="image-panel">
                    <div className="panel-header">
                      <span className="panel-label result">
                        <span className="dot" style={{ background: '#a78bfa' }} />
                        {bgColor === 'transparent' ? 'Background Removed' : 'With Background'}
                      </span>
                      {displaySrc && (
                        <div className="panel-actions">
                          <button className="btn-icon" title="Copy to clipboard" onClick={handleCopyToClipboard}>
                            <Icon d={ICONS.copy} size={14} />
                          </button>
                          <button className="btn-icon" title="Download" onClick={handleDownload}>
                            <Icon d={ICONS.download} size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      className={`panel-img-wrap${displaySrc && bgColor === 'transparent' ? ' checker-bg' : ''}`}
                      style={
                        displaySrc && bgColor !== 'transparent'
                          ? bgColor.startsWith('grad:')
                            ? { background: bgColor.slice(5) }
                            : { background: bgColor === 'custom' ? customColor : bgColor }
                          : {}
                      }
                    >
                      {displaySrc ? (
                        <img src={displaySrc} alt="Background removed result" />
                      ) : (
                        <div className="processing-overlay">
                          <div className="spinner" />
                          <p className="processing-text">{progressInfo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Download CTA */}
          {activeTab === 'single' && !showHistory && resultSrc && (
            <div className="download-cta">
              <button id="download-btn" className="btn-primary" onClick={handleDownload}>
                <Icon d={ICONS.download} size={16} />
                Download {exportFormat.toUpperCase()}
              </button>
              <button id="copy-btn" className="btn-secondary" onClick={handleCopyToClipboard}>
                <Icon d={ICONS.copy} size={16} />
                Copy to Clipboard
              </button>
              <button id="new-image-btn" className="btn-secondary" onClick={handleReset}>
                <Icon d={ICONS.image[0]} size={16} />
                New Image
              </button>
            </div>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
