import { cn } from '../../lib/utils';

function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl shadow-sm transition-colors duration-300',
        className
      )}
      style={{ 
        backgroundColor: 'var(--color-card)', 
        border: '1px solid var(--color-border)' 
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn('p-6', className)}
      style={{ borderBottom: '1px solid var(--color-border)' }}
      {...props}
    >
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-lg font-semibold', className)}
      style={{ color: 'var(--color-text)' }}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('text-sm mt-1', className)}
      style={{ color: 'var(--color-textSecondary)' }}
      {...props}
    >
      {children}
    </p>
  );
}

function CardContent({ className, children, overflow = false, ...props }) {
  return (
    <div className={cn('p-6', overflow && 'overflow-visible', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('p-6 pt-0 flex items-center gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
