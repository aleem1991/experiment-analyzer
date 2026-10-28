import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  Calendar,
  Share2,
} from 'lucide-react';
import { StoredAnalysis, VerdictType } from '../types';
import { listUserAnalyses } from '../lib/appwrite';

export const HistoryPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState<string>('all');

  useEffect(() => {
    listUserAnalyses()
      .then((data) => {
        setAnalyses(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filtered = analyses.filter((a) => {
    if (verdictFilter === 'all') return true;
    return a.verdict === verdictFilter;
  });

  const getVerdictBadge = (verdict: VerdictType) => {
    switch (verdict) {
      case 'significant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Significant
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Invalid
          </span>
        );
      case 'inconclusive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HelpCircle className="w-3 h-3" />
            Inconclusive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <AlertTriangle className="w-3 h-3" />
            Not Significant
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-rose-500" />
            <h1 className="text-2xl font-bold text-white">Experiment History</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Historical analysis logs queried from Appwrite TablesDB with row-level security
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1" />
          {['all', 'significant', 'inconclusive', 'not_significant', 'invalid'].map((f) => (
            <button
              key={f}
              onClick={() => setVerdictFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                verdictFilter === f
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          Loading experiments from TablesDB...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#14151c] border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <Database className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">No Experiments Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {verdictFilter === 'all'
              ? 'You have not run any analyses yet. Start with our 1-click demos or ingest your CSV.'
              : `No experiments with verdict '${verdictFilter}' found in your database records.`}
          </p>
          <Link
            to="/new"
            className="inline-block px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold"
          >
            Run New Analysis
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((item) => (
            <Link
              key={item.$id}
              to={`/a/${item.$id}`}
              className="group bg-[#14151c] hover:bg-[#181924] border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  {getVerdictBadge(item.verdict)}
                  <span className="text-xs font-mono text-zinc-400">
                    Test: {item.test.toUpperCase()}
                  </span>
                  {item.isPublic && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                      <Share2 className="w-3 h-3 text-emerald-400" />
                      Shared
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-rose-400 transition-colors">
                  {item.hypothesis}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>p = {item.pValue < 0.0001 ? item.pValue.toExponential(2) : item.pValue.toFixed(4)}</span>
                  <span>•</span>
                  <span>
                    Diff = {item.effectValue > 0 ? `+${item.effectValue.toFixed(3)}` : item.effectValue.toFixed(3)}
                  </span>
                  <span>•</span>
                  <span>
                    CI: [{item.ciLow.toFixed(3)}, {item.ciHigh.toFixed(3)}]
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right text-[11px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.$createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-rose-500/20 text-zinc-400 group-hover:text-rose-400 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
