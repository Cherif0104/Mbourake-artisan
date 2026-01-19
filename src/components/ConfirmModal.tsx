import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmModalProps) {
  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      confirmButton: 'bg-red-500 hover:bg-red-600 text-white',
      border: 'border-red-200'
    },
    warning: {
      icon: 'text-yellow-500',
      confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      border: 'border-yellow-200'
    },
    info: {
      icon: 'text-blue-500',
      confirmButton: 'bg-blue-500 hover:bg-blue-600 text-white',
      border: 'border-blue-200'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-50' : variant === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
          } ${styles.icon}`}>
            <AlertTriangle size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-colors ${styles.confirmButton}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
