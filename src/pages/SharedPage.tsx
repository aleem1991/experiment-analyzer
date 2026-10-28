import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Lock,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { StoredAnalysis, AssumptionCheck, DescriptivesData } from '../types';
import { getAnalysisById } from '../lib/appwrite';
import { IntervalPicture } from '../components/IntervalPicture';
import { AssumptionChecklist } from '../components/AssumptionChecklist';
import { DistributionChart } from '../components/DistributionChart';

export const SharedPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getAnalysisById(id).then((res) => {
        setAnalysis(res);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center text-zinc-400">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Fetching public analysis report...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <Lock className="w-12 h-12 text-zinc-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Private or Not Found</h2>
        <p className="text-xs text-zinc-400">
          This experiment is private to its owner or has not been shared publicly via Appwrite row permissions.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  const assumptions: AssumptionCheck[] = analysis.assumptionsJson
    ? JSON.parse(analysis.assumptionsJson)
    : [];

  const descriptives: DescriptivesData = analysis.descriptivesJson
    ? JSON.parse(analysis.descriptivesJson)
    : { a: { n: 0, label: 'Control' }, b: { n: 0, label: 'Variant' } };

  const isSignificant = analysis.verdict === 'significant';
  const isInvalid = analysis.verdict === 'invalid';
  const isInconclusive = analysis.verdict === 'inconclusive';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Public Share Notice Pill */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>Public Read-Only View:</strong> Accessible without authentication via Appwrite TablesDB{' '}
            <code className="text-rose-400 font-mono">Permission.read(Role.any())</code>.
          </span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold text-xs ml-4 whitespace-nowrap"
        >
          <span>Analyze your own experiment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 1. Verdict Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-7 border transition-all ${
          isSignificant
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : isInvalid
            ? 'bg-rose-500/10 border-rose-500/30'
            : isInconclusive
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-zinc-800/40 border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
              isSignificant
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25'
                : isInvalid
                ? 'bg-rose-500 shadow-lg shadow-rose-500/25'
                : isInconclusive
                ? 'bg-amber-500 shadow-lg shadow-amber-500/25'
                : 'bg-zinc-600'
            }`}
          >
            {isSignificant && <CheckCircle2 className="w-7 h-7" />}
            {isInvalid && <XCircle className="w-7 h-7" />}
            {isInconclusive && <HelpCircle className="w-7 h-7" />}
            {!isSignificant && !isInvalid && !isInconclusive && (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded ${
                  isSignificant
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isInvalid
                    ? 'bg-rose-500/20 text-rose-300'
                    : isInconclusive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                Verdict: {analysis.verdict.replace('_', ' ')}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Test: {analysis.test.toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {isSignificant && 'Statistically Significant & Reliable Lift'}
              {isInvalid && 'Analysis Invalid — Data Contamination / SRM'}
              {isInconclusive && 'Inconclusive — Underpowered to Rule Out Effect'}
              {analysis.verdict === 'not_significant' && 'Not Significant — Sufficiently Powered Null'}
            </h1>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800/80 text-sm text-zinc-200 leading-relaxed font-sans">
          {analysis.summaryText}
        </div>
      </div>

      {/* Pre-Registered Hypothesis Card */}
      <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pre-Registered Hypothesis</span>
          </div>
          <p className="text-sm font-medium text-white italic">
            "{analysis.hypothesis}"
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div>
            <span className="text-[10px] uppercase block text-zinc-500">Significance</span>
            <span className="text-zinc-200">&alpha; = {analysis.alpha}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase block text-zinc-500">Direction</span>
            <span className="text-zinc-200 capitalize">{analysis.alternative}</span>
          </div>
        </div>
      </div>

      {/* Confidence Interval Visualizer */}
      <IntervalPicture
        effectValue={analysis.effectValue}
        ciLow={analysis.ciLow}
        ciHigh={analysis.ciHigh}
        ciLevel={1 - analysis.alpha}
        minEffect={analysis.minEffect ?? 0.05}
        effectName={analysis.effectName}
        verdict={analysis.verdict}
      />

      {/* Statistical Assumptions Checklist */}
      <AssumptionChecklist assumptions={assumptions} />

      {/* Distribution Comparison */}
      <DistributionChart
        metricType={
          analysis.test.includes('prop') || analysis.test.includes('fisher')
            ? 'binary'
            : 'continuous'
        }
        descriptives={descriptives}
        labelA={descriptives.a?.label || 'Control'}
        labelB={descriptives.b?.label || 'Variant'}
      />
    </div>
  );
};
