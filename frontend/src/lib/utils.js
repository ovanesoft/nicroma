import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getInitials(firstName, lastName) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

export function getRoleLabel(role) {
  const roles = {
    root: 'Super Admin',
    admin: 'Administrador',
    manager: 'Manager',
    user: 'Usuario',
    client: 'Cliente'
  };
  return roles[role] || role;
}

export function getRoleColor(role) {
  const colors = {
    root: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    manager: 'bg-green-100 text-green-700 border-green-200',
    user: 'bg-slate-100 text-slate-700 border-slate-200',
    client: 'bg-cyan-100 text-cyan-700 border-cyan-200'
  };
  return colors[role] || colors.user;
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}
