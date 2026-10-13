import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Wrapper as FieldWrapper, fieldClasses, errorClasses, describe } from '../ui/FormField';

export default function PasswordField({ label, helper, error, id, className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldWrapper label={label} htmlFor={id} helper={helper} error={error} required={props.required}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`${fieldClasses} pr-10 ${error ? errorClasses : ''} ${className}`}
          {...describe(id, error, helper)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600 rounded-r-lg"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </FieldWrapper>
  );
}
