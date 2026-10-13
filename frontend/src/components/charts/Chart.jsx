import { useEffect, useRef, useState } from 'react';

const MARGIN = { top: 12, right: 12, bottom: 28, left: 44 };

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function niceScale(max, steps = 4) {
  if (max <= 0) return { max: steps, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const rough = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  const top = step * steps;
  return { max: top, ticks: Array.from({ length: steps + 1 }, (_, i) => i * step) };
}

function barPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

export default function Chart({ type = 'bar', data, series, format = (v) => v, height = 240, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const dataMax = Math.max(...data.flatMap((d) => series.map((s) => d.values[s.key] || 0)), 0);
  const scale = niceScale(dataMax);
  const y = (v) => MARGIN.top + innerH - (v / scale.max) * innerH;
  const band = data.length > 0 ? innerW / data.length : 0;
  const cx = (i) => MARGIN.left + band * i + band / 2;

  const labelEvery = Math.ceil(data.length / Math.max(Math.floor(innerW / 56), 1));

  const barGroupWidth = Math.min(band * 0.7, 28 * series.length + 2 * (series.length - 1));
  const barW = (barGroupWidth - 2 * (series.length - 1)) / series.length;

  const activeDatum = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(cx(active), 90), Math.max(width - 90, 90)) : 0;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block overflow-visible">
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-slate-300' : 'stroke-slate-200'} strokeWidth="1" />
              <text x={MARGIN.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500" fontSize="11">
                {format(t, true)}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.key} x={cx(i)} y={height - 8} textAnchor="middle" className="fill-slate-500" fontSize="11">
                {d.label}
              </text>
            ) : null
          )}

          {type === 'bar' &&
            data.map((d, i) =>
              series.map((s, si) => {
                const v = d.values[s.key] || 0;
                const h = (v / scale.max) * innerH;
                const x = cx(i) - barGroupWidth / 2 + si * (barW + 2);
                return <path key={`${d.key}-${s.key}`} d={barPath(x, y(v), barW, h, 4)} className={s.markClass} opacity={active === null || active === i ? 1 : 0.55} />;
              })
            )}

          {type === 'line' &&
            series.map((s) => {
              const pts = data.map((d, i) => [cx(i), y(d.values[s.key] || 0)]);
              const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ');
              const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z` : '';
              return (
                <g key={s.key}>
                  {area && <path d={area} className={s.areaClass} opacity="0.14" />}
                  <path d={line} fill="none" className={s.lineClass} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map(([px, py], i) => (
                    <circle key={data[i].key} cx={px} cy={py} r={active === i ? 5 : 4} className={`${s.markClass} stroke-[var(--color-surface)]`} strokeWidth="2" />
                  ))}
                </g>
              );
            })}

          {active !== null && type === 'line' && (
            <line x1={cx(active)} x2={cx(active)} y1={MARGIN.top} y2={MARGIN.top + innerH} className="stroke-slate-300" strokeDasharray="3 3" />
          )}

          {data.map((d, i) => (
            <rect
              key={d.key}
              x={MARGIN.left + band * i}
              y={MARGIN.top}
              width={band}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${d.tooltipLabel || d.label}: ${series.map((s) => `${s.label} ${format(d.values[s.key] || 0)}`).join(', ')}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none focus-visible:stroke-navy-500"
              strokeWidth="2"
            />
          ))}
        </svg>
      )}

      {activeDatum && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-surface px-3 py-2 shadow-lg text-xs"
          style={{ left: tipLeft, top: MARGIN.top + 4 }}
        >
          <p className="font-medium text-slate-900 mb-1 whitespace-nowrap">{activeDatum.tooltipLabel || activeDatum.label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 text-slate-600 whitespace-nowrap">
              <span className={`w-2.5 h-2.5 rounded-sm ${s.swatchClass}`} aria-hidden="true" />
              {s.label}: <span className="font-medium text-slate-900 tabular-nums">{format(activeDatum.values[s.key] || 0)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
