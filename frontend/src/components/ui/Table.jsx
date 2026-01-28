import { cn } from '../../lib/utils';

function Table({ className, children, ...props }) {
  return (
    <div className="w-full">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

function TableHeader({ className, children, ...props }) {
  return (
    <thead 
      className={cn(className)} 
      style={{ backgroundColor: 'var(--color-background)' }}
      {...props}
    >
      {children}
    </thead>
  );
}

function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  );
}

function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn('transition-colors', className)}
      style={{ borderBottom: '1px solid var(--color-border)' }}
      {...props}
    >
      {children}
    </tr>
  );
}

function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium',
        'first:rounded-tl-lg last:rounded-tr-lg',
        className
      )}
      style={{ color: 'var(--color-text)' }}
      {...props}
    >
      {children}
    </th>
  );
}

function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle', className)}
      style={{ color: 'var(--color-text)' }}
      {...props}
    >
      {children}
    </td>
  );
}

function TableEmpty({ message = 'No hay datos para mostrar', colSpan = 1 }) {
  return (
    <TableRow>
      <TableCell 
        colSpan={colSpan} 
        className="h-32 text-center"
        style={{ color: 'var(--color-textSecondary)' }}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };
