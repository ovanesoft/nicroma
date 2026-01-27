import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Select = forwardRef(({ className, error, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border bg-white px-3 py-2',
        'text-sm text-slate-900',
        'border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        'transition-colors duration-200',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
