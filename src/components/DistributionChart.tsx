import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DescriptivesData, MetricType } from '../types';

interface DistributionChartProps {
  metricType: MetricType;
  descriptives: DescriptivesData;
  labelA: string;
  labelB: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  metricType,
  descriptives,
  labelA,
  labelB,
}) => {
  if (!descriptives || !descriptives.a || !descriptives.b) return null;

  const { a, b } = descriptives;

  if (metricType === 'binary') {
    const rateA = (a.rate ?? 0) * 100;
    const rateB = (b.rate ?? 0) * 100;

    const data = [
      {
        name: labelA,
        rate: Number(rateA.toFixed(2)),
        n: a.n,
        successes: a.successes ?? 0,
        color: '#64748b',
      },
      {
        name: labelB,
        rate: Number(rateB.toFixed(2)),
        n: b.n,
        successes: b.successes ?? 0,
        color: '#f43f5e',
      },
    ];

    return (
      <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Conversion Rate Comparison</h4>
            <p className="text-xs text-zinc-400">
              Proportion of positive outcomes per variant ({a.n.toLocaleString()} vs {b.n.toLocaleString()} users)
            </p>
          </div>
          {descriptives.relativeLiftPct !== undefined && (
            <div className="text-right">
              <span className="text-xs text-zinc-400">Relative Lift: </span>
              <span
                className={`text-sm font-mono font-bold ${
                  descriptives.relativeLiftPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {descriptives.relativeLiftPct >= 0 ? '+' : ''}
                {descriptives.relativeLiftPct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22232e" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit="%"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1f2b',
                  borderColor: '#374151',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '12px',
                }}
                formatter={(value: any, _: any, item: any) => [
                  `${value}% (${item.payload.successes.toLocaleString()} / ${item.payload.n.toLocaleString()})`,
                  'Conversion Rate',
                ]}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={70}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Continuous metric view: Summary Statistics Card & Comparison
  const meanA = a.mean ?? 0;
  const meanB = b.mean ?? 0;
  const diffMean = meanB - meanA;

  const data = [
    {
      name: labelA,
      mean: Number(meanA.toFixed(3)),
      median: Number((a.median ?? 0).toFixed(3)),
      sd: Number((a.sd ?? 0).toFixed(3)),
      n: a.n,
      color: '#64748b',
    },
    {
      name: labelB,
      mean: Number(meanB.toFixed(3)),
      median: Number((b.median ?? 0).toFixed(3)),
      sd: Number((b.sd ?? 0).toFixed(3)),
      n: b.n,
      color: '#f43f5e',
    },
  ];

  return (
    <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">Continuous Metric Summary</h4>
          <p className="text-xs text-zinc-400">
            Means, Medians, and Dispersion across sample groups
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-400">Mean Difference: </span>
          <span
            className={`text-sm font-mono font-bold ${
              diffMean >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {diffMean >= 0 ? '+' : ''}
            {diffMean.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-900/70 p-3.5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">{labelA} (Control)</span>
            <span className="text-[11px] font-mono text-zinc-400">N = {a.n}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">Mean</span>
              <span className="font-mono font-bold text-white">{meanA.toFixed(2)}</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">Median</span>
              <span className="font-mono font-bold text-white">{(a.median ?? 0).toFixed(2)}</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">SD</span>
              <span className="font-mono font-bold text-white">{(a.sd ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/70 p-3.5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400">{labelB} (Variant)</span>
            <span className="text-[11px] font-mono text-zinc-400">N = {b.n}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">Mean</span>
              <span className="font-mono font-bold text-rose-300">{meanB.toFixed(2)}</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">Median</span>
              <span className="font-mono font-bold text-rose-300">{(b.median ?? 0).toFixed(2)}</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded">
              <span className="block text-[10px] text-zinc-400 uppercase">SD</span>
              <span className="font-mono font-bold text-rose-300">{(b.sd ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22232e" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e1f2b',
                borderColor: '#374151',
                borderRadius: '8px',
                color: '#f3f4f6',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="mean" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
