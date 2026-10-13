import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-surface text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
  danger: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors
        disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
