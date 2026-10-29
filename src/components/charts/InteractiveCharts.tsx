import React, { useState } from 'react';
import { formatIDR } from '../../lib/formatters.ts';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  formattedValue?: string;
  subtext?: string;
}

interface DonutChartProps {
  title?: string;
  subtitle?: string;
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  isCurrency?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data = [],
  size = 170,
  centerLabel = 'Total',
  centerValue,
  isCurrency = false
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const strokeWidth = 20;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const activeSlice = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* 1. Header Area: Clear Title & Subtitle without overlapping pills */}
      {(title || subtitle) && (
        <div className="mb-3.5 pb-2 border-b border-slate-100">
          {title && (
            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* 2. Visual Chart Area: Centered Donut with Clean Non-overlapping Readout */}
      <div className="flex flex-col items-center justify-center my-auto py-1">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="text-slate-100"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
            />
            {total > 0 &&
              data.map((slice, index) => {
                const percent = (slice.value || 0) / (total || 1);
                const dashLength = percent * circumference;
                const dashOffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                const isHovered = hoveredIdx === index;

                return (
                  <circle
                    key={slice.name + index}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                      filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' : 'none'
                    }}
                    onMouseEnter={() => setHoveredIdx(index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
          </svg>

          {/* Center Text Readout: Compact & strictly within hole to prevent any overlapping */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none">
              {activeSlice ? 'TERPILIH' : centerLabel}
            </span>
            <span className="text-xl font-black text-slate-900 font-mono tracking-tight mt-1 leading-none">
              {activeSlice
                ? `${Math.round(((activeSlice.value || 0) / (total || 1)) * 100)}%`
                : (centerValue || (isCurrency ? formatIDR(total) : total.toLocaleString()))}
            </span>
            <span className="text-[9px] text-slate-400 mt-1 leading-none">
              {activeSlice ? 'dari total' : `${data.length} kategori`}
            </span>
          </div>
        </div>

        {/* 3. Dedicated Interactive Hover Callout Box (Prevents any overlap with chart graphics) */}
        <div className="w-full mt-3 min-h-[38px] flex items-center justify-center">
          {activeSlice ? (
            <div
              className="w-full py-1.5 px-3 rounded-lg border flex items-center justify-between text-xs transition-all animate-fadeIn"
              style={{
                backgroundColor: `${activeSlice.color}15`,
                borderColor: `${activeSlice.color}40`
              }}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: activeSlice.color }}
                />
                <span className="font-bold text-slate-800 text-[11px] truncate">
                  {activeSlice.name}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold text-slate-900 text-[11px] shrink-0">
                <span>
                  {activeSlice.formattedValue ||
                    (isCurrency ? formatIDR(activeSlice.value) : activeSlice.value.toLocaleString())}
                </span>
                <span className="bg-white/80 px-1.5 py-0.5 rounded text-[10px] font-sans text-slate-700 border border-slate-200">
                  {Math.round(((activeSlice.value || 0) / (total || 1)) * 100)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-medium">
              <span>💡 Arahkan kursor pada diagram bulat untuk rincian data</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Structured Legend List: Generous spacing, guaranteed zero wrapping collision */}
      <div className="w-full mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
        {data.map((slice, index) => {
          const isHovered = hoveredIdx === index;
          const pct = total > 0 ? Math.round(((slice.value || 0) / total) * 100) : 0;
          return (
            <div
              key={slice.name + index}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-1.5 px-2 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                isHovered
                  ? 'bg-slate-100/90 shadow-2xs font-bold'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
              title={`${slice.name}: ${slice.formattedValue || (isCurrency ? formatIDR(slice.value) : slice.value)} (${pct}%)`}
            >
              <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-slate-800 text-[11px] font-medium">
                  {slice.name}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-slate-900 text-[11px] shrink-0">
                <span className="font-semibold">
                  {slice.formattedValue || (isCurrency ? formatIDR(slice.value) : slice.value.toLocaleString())}
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-sans">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface BarItem {
  name: string;
  value: number;
  subValue?: number;
  color?: string;
  formattedValue?: string;
  category?: string;
  benchmark?: number;
  unit?: string;
}

interface BarChartProps {
  title?: string;
  subtitle?: string;
  data: BarItem[];
  orientation?: 'horizontal' | 'vertical';
  maxValue?: number;
  isCurrency?: boolean;
  benchmarkLine?: number;
  benchmarkLabel?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  data = [],
  orientation = 'horizontal',
  maxValue,
  isCurrency = false,
  benchmarkLine,
  benchmarkLabel = 'Target SLA'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const calculatedMax =
    maxValue ||
    Math.max(
      ...data.map((d) => Math.max(d.value || 0, d.subValue || 0, d.benchmark || 0)),
      1
    );

  // ----------------------------------------------------
  // VERTICAL BAR CHART
  // ----------------------------------------------------
  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col h-full justify-between select-none">
        {/* Header with Title and Target Badge */}
        {(title || subtitle) && (
          <div className="mb-3.5 pb-2 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              {title && (
                <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  {subtitle}
                </p>
              )}
            </div>
            {benchmarkLine && (
              <div className="shrink-0 flex items-center gap-1.5 text-[10px] bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                <span className="w-2.5 h-0.5 bg-rose-500 inline-block border-b border-rose-500" />
                <span>{benchmarkLabel}: {benchmarkLine}%</span>
              </div>
            )}
          </div>
        )}

        {/* Visual Vertical Chart with ample headroom to prevent any overlap */}
        <div className="relative pt-10 pb-2 my-auto">
          {/* Target Benchmark Line with Non-overlapping Layout */}
          {benchmarkLine && (
            <div
              className="absolute left-0 right-0 border-b border-dashed border-rose-400 z-10 pointer-events-none flex justify-end"
              style={{ bottom: `${Math.min(95, (benchmarkLine / calculatedMax) * 100)}%` }}
            >
              <span className="bg-rose-100 text-rose-800 text-[9px] font-mono px-1.5 py-0.5 rounded -translate-y-3 font-extrabold shadow-2xs">
                {benchmarkLine}% Target
              </span>
            </div>
          )}

          <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-44 border-b border-slate-200 px-3">
            {data.map((item, idx) => {
              const heightPct = Math.min(100, Math.max(6, (item.value / calculatedMax) * 100));
              const isHovered = hoveredIdx === idx;
              const barColor = item.color || '#2563eb';

              return (
                <div
                  key={item.name + idx}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Tooltip with dedicated headroom */}
                  <div
                    className={`transition-all duration-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm mb-1.5 whitespace-nowrap ${
                      isHovered
                        ? 'opacity-100 bg-slate-900 text-white scale-105 z-20'
                        : 'opacity-75 text-slate-700 bg-slate-100 group-hover:opacity-100'
                    }`}
                  >
                    {item.formattedValue ||
                      (isCurrency ? formatIDR(item.value) : `${item.value}${item.unit || ''}`)}
                  </div>

                  {/* Bar Body */}
                  <div className="w-full max-w-[44px] bg-slate-100 rounded-t-md overflow-hidden relative">
                    <div
                      className="w-full transition-all duration-500 rounded-t-md group-hover:brightness-110"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: barColor,
                        opacity: hoveredIdx === null || isHovered ? 1 : 0.65
                      }}
                    />
                  </div>

                  {/* Clean Bottom Label with tooltip */}
                  <span
                    className="text-[10px] text-slate-600 font-semibold mt-2 text-center truncate max-w-[90px] leading-tight"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-3 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>{data.length} unit observasi</span>
          <span>Berdasarkan telemetri real-time</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // HORIZONTAL BAR CHART
  // ----------------------------------------------------
  return (
    <div className="flex flex-col h-full justify-between select-none">
      {(title || subtitle) && (
        <div className="mb-3.5 pb-2 border-b border-slate-100">
          {title && (
            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 my-auto">
        {data.map((item, idx) => {
          const pct = Math.min(100, Math.max(3, (item.value / calculatedMax) * 100));
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || '#2563eb';

          return (
            <div
              key={item.name + idx}
              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-slate-50 border-slate-300 shadow-2xs'
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50/50'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={`${item.name}: ${item.formattedValue || (isCurrency ? formatIDR(item.value) : item.value)}`}
            >
              {/* Row 1: Name on Left, Formatted Value on Right (Zero Wrapping Overlap) */}
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <span className="font-semibold text-slate-800 text-[11px] truncate">
                  {item.name}
                </span>
                <span className="font-mono font-bold text-slate-900 text-[11px] tabular-nums shrink-0">
                  {item.formattedValue ||
                    (isCurrency ? formatIDR(item.value) : `${item.value} ${item.unit || ''}`)}
                </span>
              </div>

              {/* Row 2: Full-width Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.75
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Total item: {data.length}</span>
        <span>Nilai maksimal: {isCurrency ? formatIDR(calculatedMax) : calculatedMax.toLocaleString()}</span>
      </div>
    </div>
  );
};

export interface ComparisonItem {
  label: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  unit?: string;
  isCurrency?: boolean;
}

interface ComparisonBarChartProps {
  title?: string;
  subtitle?: string;
  data: ComparisonItem[];
  primaryColor?: string;
  secondaryColor?: string;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  title,
  subtitle,
  data = [],
  primaryColor = '#1e3a8a',
  secondaryColor = '#059669'
}) => {
  const max = Math.max(
    ...data.flatMap((d) => [d.primaryValue || 0, d.secondaryValue || 0]),
    1
  );

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Header and Legend cleanly partitioned */}
      <div className="mb-4 pb-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && (
            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-slate-700">{data[0]?.primaryLabel || 'Pagu Anggaran'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
            <span className="text-slate-700">{data[0]?.secondaryLabel || 'Realisasi Biaya'}</span>
          </div>
        </div>
      </div>

      {/* Comparison Rows with Spacious Structured Cards */}
      <div className="space-y-3.5 my-auto">
        {data.map((item) => {
          const primaryPct = Math.min(100, Math.max(4, (item.primaryValue / max) * 100));
          const secondaryPct = Math.min(100, Math.max(4, (item.secondaryValue / max) * 100));
          const variance = item.primaryValue - item.secondaryValue;
          const variancePct =
            item.primaryValue > 0 ? Math.round((variance / item.primaryValue) * 100) : 0;
          const isFavorable = variance >= 0;

          return (
            <div
              key={item.label}
              className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2.5 transition-all hover:bg-slate-100/50"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900">{item.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isFavorable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {isFavorable
                    ? `Hemat +${variancePct}% (${formatIDR(variance)})`
                    : `Melebihi ${variancePct}% (${formatIDR(Math.abs(variance))})`}
                </span>
              </div>

              {/* Primary Bar (Pagu Anggaran) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{item.primaryLabel}:</span>
                  <span className="font-bold text-slate-800">
                    {item.isCurrency ? formatIDR(item.primaryValue) : `${item.primaryValue} ${item.unit || ''}`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${primaryPct}%`, backgroundColor: primaryColor }}
                  />
                </div>
              </div>

              {/* Secondary Bar (Realisasi) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{item.secondaryLabel}:</span>
                  <span className="font-extrabold text-slate-900">
                    {item.isCurrency ? formatIDR(item.secondaryValue) : `${item.secondaryValue} ${item.unit || ''}`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${secondaryPct}%`, backgroundColor: secondaryColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Data keuangan diverifikasi</span>
        <span>Status: Disetujui Tim Finansial &amp; Maintenance</span>
      </div>
    </div>
  );
};

interface CircularGaugeProps {
  title?: string;
  subtitle?: string;
  value: number;
  target?: number;
  unit?: string;
  size?: number;
  statusBadge?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  title,
  subtitle,
  value,
  target = 95,
  unit = '%',
  size = 180,
  statusBadge
}) => {
  const radius = 62;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 180-degree semi-circle
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  const isAchieved = value >= target;
  const arcColor = isAchieved ? '#10b981' : value >= target - 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-between h-full p-2 text-center select-none">
      {(title || subtitle) && (
        <div className="mb-3 pb-2 border-b border-slate-100 w-full text-left">
          {title && (
            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Speedometer semi-circle arc with clean non-overlapping bottom cavity */}
      <div className="relative my-auto" style={{ width: size, height: size / 1.6 }}>
        <svg className="w-full h-full overflow-visible" viewBox="0 0 160 100">
          {/* Base Arc */}
          <path
            d="M 18 82 A 62 62 0 0 1 142 82"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Filled Arc */}
          <path
            d="M 18 82 A 62 62 0 0 1 142 82"
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>

        {/* Center Readout with ample padding */}
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center">
          <span className="text-2xl md:text-3xl font-black font-mono tabular-nums text-slate-900 leading-none">
            {value.toFixed(1)}{unit}
          </span>
          <span className="text-[10px] font-bold text-slate-500 mt-1">
            Target Standar SLA: {target}{unit}
          </span>
        </div>
      </div>

      <div className="mt-4 w-full flex flex-col items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
            isAchieved
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAchieved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          {statusBadge || (isAchieved ? 'Target SLA Tercapai (Sesuai SOP)' : 'Memerlukan Tindakan Korektif')}
        </span>
        <span className="text-[10px] text-slate-400">
          Disetujui oleh Supervisor Warto
        </span>
      </div>
    </div>
  );
};
