'use client';

import React, { useState } from 'react';
import { LucideIcon, AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: 'danger' | 'warning' | 'primary';
  icon?: LucideIcon;
  requiresTyping?: boolean;
  typingConfirmation?: string;
  children?: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmType = 'primary',
  icon: Icon = AlertTriangle,
  requiresTyping = false,
  typingConfirmation = 'DELETE',
  children
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('');

  const isConfirmDisabled = requiresTyping && typedText !== typingConfirmation;

  const getConfirmButtonClasses = () => {
    const baseClasses = 'px-6 py-3 rounded font-medium transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (confirmType) {
      case 'danger':
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
      case 'warning':
        return `${baseClasses} bg-yellow-600 hover:bg-yellow-700 text-white`;
      default:
        return `${baseClasses} btn-sage-primary`;
    }
  };

  const getIconColor = () => {
    switch (confirmType) {
      case 'danger':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-sage-green';
    }
  };

  const handleConfirm = () => {
    if (!isConfirmDisabled) {
      onConfirm();
      setTypedText(''); // Reset for next time
    }
  };

  const handleClose = () => {
    setTypedText(''); // Reset for next time
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Icon className={`w-6 h-6 ${getIconColor()}`} />
          <h3 className="text-lg font-semibold text-sage-dark">{title}</h3>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sage-gray mb-4">{description}</p>
          
          {children}

          {requiresTyping && (
            <div>
              <p className="text-sage-gray mb-2 text-sm">
                Type "<strong>{typingConfirmation}</strong>" to confirm this action:
              </p>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type ${typingConfirmation}`}
                className={`w-full p-3 border rounded focus:ring-2 focus:outline-none ${
                  confirmType === 'danger' 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-sage-green focus:border-sage-green'
                }`}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={getConfirmButtonClasses()}
          >
            {confirmText}
          </button>
          <button
            onClick={handleClose}
            className="btn-sage-secondary flex-1"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;