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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Content */}
      <div
        className={cn(
          'relative w-full rounded-2xl shadow-2xl animate-scale-in',
          sizes[size],
          className
        )}
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ children, onClose, className }) {
  return (
    <div 
      className={cn('flex items-center justify-between p-6', className)}
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function ModalTitle({ children, className }) {
  return (
    <h2 
      className={cn('text-lg font-semibold', className)}
      style={{ color: 'var(--color-text)' }}
    >
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
