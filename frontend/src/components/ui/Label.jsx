import { cn } from '../../lib/utils';

export function Label({ className, children, required, ...props }) {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-slate-700 mb-1',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
