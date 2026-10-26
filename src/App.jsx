import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [status, setStatus] = useState('idle');
  const [progressInfo, setProgressInfo] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize Web Worker on mount
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { status, data } = e.data;
      if (status === 'loading' || status === 'processing') {
        setStatus(status);
        setProgressInfo(data);
      } else if (status === 'progress') {
        setStatus('loading');
        setProgressInfo(`Downloading model (${data.file}): ${Math.round(data.progress || 0)}%`);
      } else if (status === 'ready') {
        setStatus('ready');
      } else if (status === 'complete') {
        setStatus('ready');
        const url = URL.createObjectURL(data);
        setResultSrc(url);
      } else if (status === 'error') {
        setStatus('error');
        setProgressInfo(data);
      }
    };

    // Trigger model preload
    workerRef.current.postMessage({ type: 'LOAD_MODEL' });

    return () => workerRef.current.terminate();
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImageSrc(base64);
      setResultSrc(null);
      setStatus('processing');
      workerRef.current.postMessage({ type: 'RUN_INFERENCE', data: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Instant Smart Dropzone
        </h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          Client-side AI Background Removal running locally via WebGPU & Transformers.js (Zero APIs, Zero Servers).
        </p>

        {/* Status Banner */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-300">Model Status:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              status === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
            }`}>
            {status === 'ready' ? 'Ready (Cached)' : progressInfo || status}
          </span>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-10 text-center transition-colors cursor-pointer bg-slate-950/40 relative group"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center pointer-events-none">
            <svg className="w-12 h-12 text-slate-500 group-hover:text-cyan-400 mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-300 font-medium mb-1">Drag and drop an image here, or click to browse</p>
            <p className="text-slate-500 text-xs">Runs completely offline in your browser</p>
          </div>
        </div>

        {/* Image Preview Grid */}
        {(imageSrc || resultSrc) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {imageSrc && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Original Image</h3>
                <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 h-64 flex items-center justify-center">
                  <img src={imageSrc} alt="Original" className="max-h-full object-contain rounded-lg" />
                </div>
              </div>
            )}
            {resultSrc && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Background Removed</h3>
                <div className="bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 h-64 flex items-center justify-center">
                  <img src={resultSrc} alt="Processed Result" className="max-h-full object-contain rounded-lg" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}