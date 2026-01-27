import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

function Modal({ 
  open, 
  onClose, 
  children, 
  className,
  size = 'md'
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Content */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl animate-scale-in',
          sizes[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ children, onClose, className }) {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b border-slate-100', className)}>
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function ModalTitle({ children, className }) {
  return (
    <h2 className={cn('text-lg font-semibold text-slate-800', className)}>
      {children}
    </h2>
  );
}

function ModalContent({ children, className }) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 pt-0', className)}>
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter };
