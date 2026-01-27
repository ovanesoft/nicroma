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
    <thead className={cn('bg-slate-50', className)} {...props}>
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
      className={cn(
        'border-b border-slate-100 transition-colors hover:bg-slate-50/50',
        className
      )}
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
        'h-12 px-4 text-left align-middle font-medium text-slate-500',
        'first:rounded-tl-lg last:rounded-tr-lg',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-slate-700', className)}
      {...props}
    >
      {children}
    </td>
  );
}

function TableEmpty({ message = 'No hay datos para mostrar', colSpan = 1 }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-slate-500">
        {message}
      </TableCell>
    </TableRow>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };
