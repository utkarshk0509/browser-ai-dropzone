import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ── Icons (inline SVG helpers) ───────────────────────────────── */
const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  copy: ['M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z'],
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'],
  cpu: ['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'],
  check: 'M20 6L9 17l-5-5',
  image: ['M21 15l-5-5L5 20', 'M3 9l4-4 4 4', 'M14 3h7v7'],
  sparkle: ['M12 3v1m0 16v1M4.22 4.22l.7.7m12.16 12.16.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7'],
};

/* ── Toast Component ─────────────────────────────────────────── */
function Toast({ message, onHide }) {
  const [hiding, setHiding] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2400);
    const t2 = setTimeout(onHide, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onHide]);

  return (
    <div className="toast-wrap">
      <div className={`toast${hiding ? ' hiding' : ''}`}>
        <Icon d={ICONS.check} size={14} style={{ color: '#4ade80' }} />
        {message}
      </div>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────────── */
export default function App() {
  const [status, setStatus]           = useState('idle');
  const [progressInfo, setProgressInfo] = useState('Initializing…');
  const [progressPct, setProgressPct] = useState(0);
  const [imageSrc, setImageSrc]       = useState(null);
  const [resultSrc, setResultSrc]     = useState(null);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [toast, setToast]             = useState(null);
  const workerRef = useRef(null);
  const resultBlobRef = useRef(null);
  const fileNameRef = useRef('image');

  const showToast = (msg) => setToast(msg);

  /* ── Worker setup ──────────────────────────────────────────── */
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { status: s, data } = e.data;

      if (s === 'loading') {
        setStatus('loading');
        setProgressInfo(data);
        setProgressPct(5);
      } else if (s === 'progress') {
        setStatus('loading');
        const pct = Math.round(data.progress || 0);
        setProgressInfo(`Downloading model… ${pct}%`);
        setProgressPct(pct);
      } else if (s === 'processing') {
        setStatus('processing');
        setProgressInfo(data);
        setProgressPct(0);
      } else if (s === 'ready') {
        setStatus('ready');
        setProgressInfo('Ready');
        setProgressPct(100);
      } else if (s === 'complete') {
        setStatus('ready');
        setProgressInfo('Done!');
        resultBlobRef.current = data;
        const url = URL.createObjectURL(data);
        setResultSrc(url);
        showToast('Background removed successfully!');
      } else if (s === 'error') {
        setStatus('error');
        setProgressInfo(data);
      }
    };

    workerRef.current.postMessage({ type: 'LOAD_MODEL' });
    return () => workerRef.current.terminate();
  }, []);

  /* ── File processing ───────────────────────────────────────── */
  const processImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    fileNameRef.current = file.name.replace(/\.[^.]+$/, '') || 'image';
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImageSrc(base64);
      setResultSrc(null);
      resultBlobRef.current = null;
      setStatus('processing');
      setProgressInfo('Analysing image…');
      workerRef.current.postMessage({ type: 'RUN_INFERENCE', data: base64 });
    };
    reader.readAsDataURL(file);
  }, []);

  /* ── Drag events ───────────────────────────────────────────── */
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = ()  => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processImage(e.dataTransfer.files?.[0]);
  };
  const handleFileSelect = (e) => processImage(e.target.files?.[0]);

  /* ── Actions ───────────────────────────────────────────────── */
  const handleDownload = () => {
    if (!resultBlobRef.current) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlobRef.current);
    a.download = `${fileNameRef.current}_no_bg.png`;
    a.click();
    showToast('Image downloaded!');
  };

  const handleCopyToClipboard = async () => {
    if (!resultBlobRef.current) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': resultBlobRef.current })
      ]);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Copy not supported in this browser.');
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setResultSrc(null);
    resultBlobRef.current = null;
    if (status !== 'loading' && status !== 'processing') {
      setStatus(workerRef.current ? 'ready' : 'idle');
    }
  };

  /* ── Status pill helper ────────────────────────────────────── */
  const pillText = {
    idle: 'Idle',
    loading: progressInfo,
    processing: 'Processing…',
    ready: 'Model Ready',
    error: 'Error',
  }[status] || progressInfo;

  const isLoading = status === 'loading' || status === 'processing';

  return (
    <>
      {/* Animated background */}
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
              <div className={`progress-bar-wrap${isLoading ? ' visible' : ''}`} style={{ flex: 1, maxWidth: 220 }}>
                <div className="progress-bar-fill" style={{ width: status === 'processing' ? '60%' : `${progressPct}%` }} />
              </div>
            )}

            <span className={`status-pill ${status}`}>{pillText}</span>
          </div>

          {/* Feature chips */}
          <div className="features-row">
            {[
              { icon: ICONS.zap,     label: 'WebGPU Accelerated' },
              { icon: ICONS.shield,  label: 'Privacy First' },
              { icon: ICONS.sparkle, label: 'RMBG-1.4 Model' },
            ].map(({ icon, label }) => (
              <div key={label} className="feature-chip">
                <Icon d={icon} size={13} />
                {label}
              </div>
            ))}
          </div>

          {/* Dropzone */}
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
              onChange={handleFileSelect}
              aria-label="Select image file"
            />
            <div className="dropzone-icon">
              <Icon d={ICONS.upload} size={28} style={{ color: '#a78bfa' }} />
            </div>
            <p className="dropzone-title">
              {isDragOver ? 'Release to remove background' : 'Drop your image here'}
            </p>
            <p className="dropzone-sub">or click to browse from your device</p>
            <div className="dropzone-formats">
              {['PNG', 'JPG', 'WEBP', 'AVIF', 'GIF'].map(f => (
                <span key={f} className="format-tag">{f}</span>
              ))}
            </div>
          </div>

          {/* Image Results */}
          {imageSrc && (
            <div className="result-grid" aria-label="Image results">

              {/* Original */}
              <div className="image-panel">
                <div className="panel-header">
                  <span className="panel-label">
                    <span className="dot" style={{ background: '#6b7fa8' }} />
                    Original
                  </span>
                  <div className="panel-actions">
                    <button
                      className="btn-icon"
                      title="Remove image"
                      onClick={handleReset}
                      aria-label="Remove image"
                    >
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
                    Background Removed
                  </span>
                  {resultSrc && (
                    <div className="panel-actions">
                      <button
                        className="btn-icon"
                        title="Copy to clipboard"
                        onClick={handleCopyToClipboard}
                        aria-label="Copy result to clipboard"
                      >
                        <Icon d={ICONS.copy} size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Download PNG"
                        onClick={handleDownload}
                        aria-label="Download result as PNG"
                      >
                        <Icon d={ICONS.download} size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className={`panel-img-wrap${resultSrc ? ' checker-bg' : ''}`}>
                  {resultSrc ? (
                    <img src={resultSrc} alt="Background removed result" />
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

          {/* Download CTA */}
          {resultSrc && (
            <div className="download-cta">
              <button id="download-btn" className="btn-primary" onClick={handleDownload}>
                <Icon d={ICONS.download} size={16} />
                Download PNG
              </button>
              <button id="copy-btn" className="btn-secondary" onClick={handleCopyToClipboard}>
                <Icon d={ICONS.copy} size={16} />
                Copy to Clipboard
              </button>
              <button id="new-image-btn" className="btn-secondary" onClick={handleReset}>
                <Icon d={ICONS.image} size={16} />
                New Image
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}
    </>
  );
}