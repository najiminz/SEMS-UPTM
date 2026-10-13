export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Th({ children, className = '' }) {
  return <th className={`py-3 px-4 font-medium whitespace-nowrap ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`py-3 px-4 align-middle ${className}`}>{children}</td>;
}
