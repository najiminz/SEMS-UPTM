export const fieldClasses =
  'w-full bg-surface border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400';
export const errorClasses = 'border-red-400';

export function describe(id, error, helper) {
  if (!id) return {};
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || helper ? `${id}-hint` : undefined,
  };
}

export function Wrapper({ label, htmlFor, helper, error, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-red-600 mt-1.5">{error}</p>
      ) : (
        helper && (
          <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-slate-400 mt-1.5">{helper}</p>
        )
      )}
    </div>
  );
}

export function TextField({ label, helper, error, id, className = '', ...props }) {
  return (
    <Wrapper label={label} htmlFor={id} helper={helper} error={error} required={props.required}>
      <input
        id={id}
        className={`${fieldClasses} ${error ? errorClasses : ''} ${className}`}
        {...describe(id, error, helper)}
        {...props}
      />
    </Wrapper>
  );
}

export function TextareaField({ label, helper, error, id, className = '', rows = 4, ...props }) {
  return (
    <Wrapper label={label} htmlFor={id} helper={helper} error={error} required={props.required}>
      <textarea
        id={id}
        rows={rows}
        className={`${fieldClasses} resize-y ${error ? errorClasses : ''} ${className}`}
        {...describe(id, error, helper)}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({ label, helper, error, id, className = '', children, ...props }) {
  return (
    <Wrapper label={label} htmlFor={id} helper={helper} error={error} required={props.required}>
      <select
        id={id}
        className={`${fieldClasses} bg-surface ${error ? errorClasses : ''} ${className}`}
        {...describe(id, error, helper)}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}
