export default function AuthIllustration() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm">
      <circle cx="200" cy="200" r="170" fill="#f1f5f9" />

      <rect x="90" y="110" width="220" height="190" rx="14" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="90" y="110" width="220" height="46" rx="14" fill="#003b70" />
      <rect x="90" y="140" width="220" height="16" fill="#003b70" />
      <rect x="118" y="96" width="10" height="28" rx="5" fill="#003b70" />
      <rect x="272" y="96" width="10" height="28" rx="5" fill="#003b70" />

      {[0, 1, 2, 3, 4].map((col) =>
        [0, 1, 2].map((row) => (
          <rect
            key={`${col}-${row}`}
            x={118 + col * 40}
            y={180 + row * 34}
            width="24"
            height="20"
            rx="4"
            fill={col === 2 && row === 1 ? '#c8102e' : '#e2e8f0'}
          />
        ))
      )}

      <circle cx="130" cy="190" r="0" />
      <g transform="translate(238,264)">
        <circle r="26" fill="#16a34a" />
        <path d="M-9 0 L-2 8 L11 -9" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      <g transform="translate(84,272)">
        <circle r="30" fill="white" stroke="#cbd5e1" strokeWidth="2" />
        <path
          d="M0 -14 L12 -9 V3 C12 12 6 18 0 20 C-6 18 -12 12 -12 3 V-9 Z"
          fill="#003b70"
        />
        <path d="M-5 0 L-1 5 L6 -6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      <circle cx="320" cy="150" r="5" fill="#94a3b8" />
      <circle cx="70" cy="120" r="4" fill="#94a3b8" />
      <circle cx="330" cy="290" r="6" fill="#cbd5e1" />
    </svg>
  );
}
