import { useRef } from 'react';

const LENGTH = 6;

const BOX_STATE = {
  idle: 'border-slate-300 focus:border-navy-600',
  error: 'border-red-400 bg-red-50 text-red-700',
  success: 'border-green-500 bg-green-50 text-green-700',
};

export default function OtpInput({ value, onChange, status = 'idle', disabled = false, autoFocus = false, label = 'One-time code' }) {
  const refs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || '');

  function focusBox(index) {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function setFrom(index, incoming) {
    const clean = incoming.replace(/\D/g, '');
    if (!clean) return;
    const next = digits.slice();
    let i = index;
    for (const ch of clean) {
      if (i >= LENGTH) break;
      next[i++] = ch;
    }
    onChange(next.join('').slice(0, LENGTH));
    focusBox(i >= LENGTH ? LENGTH - 1 : i);
  }

  function handleChange(index, e) {
    const raw = e.target.value;
    if (raw === '') {
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }
    setFrom(index, raw);
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[index - 1] = '';
      onChange(next.join(''));
      focusBox(index - 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(index, e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    setFrom(pasted.length >= LENGTH ? 0 : index, pasted);
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2 sm:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          maxLength={LENGTH}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={status === 'error' ? true : undefined}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`w-full min-w-0 aspect-square max-w-14 text-center text-xl font-semibold text-slate-900 bg-surface
            border rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${BOX_STATE[status]}`}
        />
      ))}
    </div>
  );
}
