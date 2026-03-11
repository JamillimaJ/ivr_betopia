import React, { useEffect } from 'react';

const TYPE_CONFIG = {
  danger:  { icon: 'fa-triangle-exclamation', iconBg: 'bg-red-100',    iconColor: 'text-red-600',    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',    title: 'text-gray-900' },
  warning: { icon: 'fa-circle-exclamation',   iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',  title: 'text-gray-900' },
  info:    { icon: 'fa-circle-info',           iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   confirmClass: 'bg-betopia-navy hover:bg-opacity-90 text-white', title: 'text-gray-900' },
};

/**
 * ConfirmDialog
 * @param {object} props
 * @param {boolean} props.open
 * @param {string}  props.type       - 'danger' | 'warning' | 'info'
 * @param {string}  props.title
 * @param {string}  props.message
 * @param {string}  [props.confirmLabel]
 * @param {string}  [props.cancelLabel]
 * @param {()=>void} props.onConfirm
 * @param {()=>void} props.onCancel
 */
const ConfirmDialog = ({
  open,
  type = 'danger',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.danger;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[fadeScaleIn_0.2s_ease-out]">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
            <i className={`fas ${cfg.icon} text-xl ${cfg.iconColor}`}></i>
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <h3 className={`text-lg font-semibold ${cfg.title}`}>{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm ${cfg.confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;
