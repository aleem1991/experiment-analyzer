import React from 'react';

interface IntervalPictureProps {
  effectValue: number;
  ciLow: number;
  ciHigh: number;
  ciLevel: number;
  minEffect: number;
  effectName: string;
  verdict: 'significant' | 'not_significant' | 'inconclusive' | 'invalid';
}

export const IntervalPicture: React.FC<IntervalPictureProps> = ({
  effectValue,
  ciLow,
  ciHigh,
  ciLevel,
  minEffect,
  effectName,
  verdict,
}) => {
  // SVG Canvas dimensions
  const width = 640;
  const height = 150;
  const paddingX = 60;
  const plotWidth = width - 2 * paddingX;
  const axisY = 75;

  // Compute dynamic domain
  const rawMin = Math.min(0, ciLow, -Math.abs(minEffect), effectValue);
  const rawMax = Math.max(0, ciHigh, Math.abs(minEffect), effectValue);
  const range = rawMax - rawMin || 1;
  const margin = range * 0.18;
  const domainMin = rawMin - margin;
  const domainMax = rawMax + margin;

  // Scale function: maps value in [domainMin, domainMax] to [paddingX, width - paddingX]
  const scale = (val: number) => {
    return paddingX + ((val - domainMin) / (domainMax - domainMin)) * plotWidth;
  };

  const xZero = scale(0);
  const xEstimate = scale(effectValue);
  const xCiLow = scale(ciLow);
  const xCiHigh = scale(ciHigh);
  const xMinEffectPos = scale(Math.abs(minEffect));
  const xMinEffectNeg = scale(-Math.abs(minEffect));

  // Visual colors according to verdict
  const isSig = verdict === 'significant';
  const strokeColor = isSig ? '#10b981' : verdict === 'inconclusive' ? '#f59e0b' : '#64748b';
  const dotColor = isSig ? '#34d399' : verdict === 'inconclusive' ? '#fbbf24' : '#94a3b8';

  return (
    <div className="w-full bg-[#14151c] border border-zinc-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">
            Effect Size & Confidence Interval Visualizer
          </h4>
          <p className="text-xs text-zinc-400 capitalize">
            {effectName} with {Math.round(ciLevel * 100)}% interval vs. Minimum Meaningful Effect
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40" />
            Min Effect Threshold (±{minEffect.toFixed(3)})
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
            Point Estimate
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="minEffectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Shaded band for minimum effect threshold [-minEffect, +minEffect] */}
          {minEffect > 0 && (
            <g>
              <rect
                x={xMinEffectNeg}
                y={25}
                width={Math.max(2, xMinEffectPos - xMinEffectNeg)}
                height={70}
                fill="url(#minEffectGrad)"
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3 3"
                rx={4}
              />
              <text
                x={(xMinEffectNeg + xMinEffectPos) / 2}
                y={38}
                textAnchor="middle"
                className="text-[10px] fill-rose-400 font-medium"
              >
                Practical Indifference Zone
              </text>
            </g>
          )}

          {/* Horizontal Axis */}
          <line
            x1={paddingX - 10}
            y1={axisY}
            x2={width - paddingX + 10}
            y2={axisY}
            stroke="#272733"
            strokeWidth="1.5"
          />

          {/* Zero Line (Null Hypothesis: No Difference) */}
          <line
            x1={xZero}
            y1={20}
            x2={xZero}
            y2={110}
            stroke="#71717a"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={xZero}
            y={124}
            textAnchor="middle"
            className="text-[11px] font-mono fill-zinc-400 font-semibold"
          >
            0 (Null)
          </text>

          {/* Confidence Interval Whisker Bar */}
          <line
            x1={xCiLow}
            y1={axisY}
            x2={xCiHigh}
            y2={axisY}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Left Cap */}
          <line
            x1={xCiLow}
            y1={axisY - 8}
            x2={xCiLow}
            y2={axisY + 8}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
          {/* Right Cap */}
          <line
            x1={xCiHigh}
            y1={axisY - 8}
            x2={xCiHigh}
            y2={axisY + 8}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* Point Estimate Dot */}
          <circle
            cx={xEstimate}
            cy={axisY}
            r="6"
            fill={dotColor}
            stroke="#0c0d12"
            strokeWidth="2"
            className="drop-shadow-md"
          />

          {/* Label: CI Low */}
          <text
            x={xCiLow}
            y={axisY - 14}
            textAnchor="middle"
            className="text-[11px] font-mono fill-zinc-400"
          >
            {ciLow.toFixed(3)}
          </text>

          {/* Label: Point Estimate */}
          <text
            x={xEstimate}
            y={axisY + 22}
            textAnchor="middle"
            className="text-[12px] font-mono font-bold fill-white"
          >
            {effectValue > 0 ? `+${effectValue.toFixed(3)}` : effectValue.toFixed(3)}
          </text>

          {/* Label: CI High */}
          <text
            x={xCiHigh}
            y={axisY - 14}
            textAnchor="middle"
            className="text-[11px] font-mono fill-zinc-400"
          >
            {ciHigh.toFixed(3)}
          </text>
        </svg>
      </div>

      <div className="mt-2 text-xs text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between">
        <span>
          <strong>Interpretation:</strong>{' '}
          {ciLow > 0 || ciHigh < 0
            ? 'The confidence interval excludes zero, ruling out pure chance under the declared significance level.'
            : 'The confidence interval spans across zero, indicating insufficient evidence to reject the null hypothesis.'}
        </span>
        <span className="font-mono text-zinc-300 ml-2 whitespace-nowrap">
          Estimate: {effectValue.toFixed(4)} [{ciLow.toFixed(4)}, {ciHigh.toFixed(4)}]
        </span>
      </div>
    </div>
  );
};
