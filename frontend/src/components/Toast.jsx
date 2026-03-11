import React, { useState, useCallback, useEffect, useRef } from 'react';

const ICONS = {
  success: { icon: 'fa-circle-check', bg: 'bg-green-50', border: 'border-green-200', title: 'text-green-800', body: 'text-green-700', bar: 'bg-green-500', close: 'text-green-400 hover:text-green-600' },
  error:   { icon: 'fa-circle-xmark', bg: 'bg-red-50',   border: 'border-red-200',   title: 'text-red-800',   body: 'text-red-700',   bar: 'bg-red-500',   close: 'text-red-400 hover:text-red-600'   },
  warning: { icon: 'fa-triangle-exclamation', bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-800', body: 'text-amber-700', bar: 'bg-amber-500', close: 'text-amber-400 hover:text-amber-600' },
  info:    { icon: 'fa-circle-info', bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800', body: 'text-blue-700', bar: 'bg-blue-500', close: 'text-blue-400 hover:text-blue-600' },
};

const Toast = ({ id, type = 'info', title, message, duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = ICONS[type] || ICONS.info;

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`relative flex items-start gap-4 w-full max-w-sm p-4 rounded-xl border shadow-xl backdrop-blur-sm transition-all duration-300
        ${cfg.bg} ${cfg.border}
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {/* Icon */}
      <div className={`mt-0.5 text-xl ${cfg.title}`}>
        <i className={`fas ${cfg.icon}`}></i>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <p className={`font-semibold text-sm leading-tight ${cfg.title}`}>{title}</p>}
        {message && <p className={`text-sm mt-0.5 leading-relaxed ${cfg.body}`}>{message}</p>}
      </div>

      {/* Close */}
      <button onClick={dismiss} className={`mt-0.5 text-sm transition-colors ${cfg.close}`}>
        <i className="fas fa-xmark"></i>
      </button>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 h-1 rounded-b-xl ${cfg.bar} opacity-40`}
        style={{ animation: `shrink ${duration}ms linear forwards` }}
      />
    </div>
  );
};

// ─── Toast Container + Context ───────────────────────────────────────────────

import { createContext, useContext } from 'react';

const ToastContext = createContext(null);

let _idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message, duration) => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, message, duration) => addToast('success', title, message, duration),
    error:   (title, message, duration) => addToast('error',   title, message, duration),
    warning: (title, message, duration) => addToast('warning', title, message, duration),
    info:    (title, message, duration) => addToast('info',    title, message, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal: bottom-right stack */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={removeToast} />
          </div>
        ))}
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
