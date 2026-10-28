import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Share2,
  Download,
  FileText,
  RotateCcw,
  Lock,
  Info,
} from 'lucide-react';
import { StoredAnalysis, AssumptionCheck, DescriptivesData } from '../types';
import { getAnalysisById, toggleShareAnalysis } from '../lib/appwrite';
import { IntervalPicture } from '../components/IntervalPicture';
import { AssumptionChecklist } from '../components/AssumptionChecklist';
import { DistributionChart } from '../components/DistributionChart';

export const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (id) {
      getAnalysisById(id).then((res) => {
        setAnalysis(res);
        setIsShared(Boolean(res?.isPublic));
        setLoading(false);
      });
    }
  }, [id]);

  const handleToggleShare = async () => {
    if (!analysis) return;
    const nextState = !isShared;
    setIsShared(nextState);
    await toggleShareAnalysis(analysis.$id, nextState);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/s/${analysis?.$id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const handleDownloadJSON = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${analysis.$id}.json`;
    a.click();
  };

  const handleDownloadMarkdown = () => {
    if (!analysis) return;
    const md = `# Experiment Analyzer Report: ${analysis.hypothesis}
Date: ${analysis.$createdAt}
Verdict: ${analysis.verdict.toUpperCase()}
Statistical Test: ${analysis.test}
p-value: ${analysis.pValue}
Effect Size: ${analysis.effectValue} (${analysis.effectName})
Confidence Interval (${Math.round((1 - analysis.alpha) * 100)}%): [${analysis.ciLow}, ${analysis.ciHigh}]
Minimum Detectable Effect (MDE @ 80% Power): ${analysis.mde}
Smallest Effect That Matters: ${analysis.minEffect}

## Summary
${analysis.summaryText || 'No summary text available.'}

## Caveats
${(analysis.caveats || []).map((c) => `- ${c}`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${analysis.$id}.md`;
    a.click();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center text-zinc-400">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Retrieving analysis from TablesDB...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Analysis Not Found</h2>
        <p className="text-xs text-zinc-400">
          The requested analysis does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/new"
          className="inline-block px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold"
        >
          Run a New Experiment
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleToggleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isShared
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isShared ? 'Public Sharing ON' : 'Make Public'}</span>
            </button>
            {isShared && (
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white shadow-md shadow-rose-500/20"
              >
                <span>{shareCopied ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Plain Language Interpretation */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 text-sm text-zinc-200 leading-relaxed font-sans">
          {analysis.summaryText}
        </div>
      </div>

      {/* Pre-Registered Hypothesis Card (Locked) */}
      <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pre-Registered Declaration (Locked on {new Date(analysis.$createdAt).toLocaleDateString()})</span>
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
          <div>
            <span className="text-[10px] uppercase block text-zinc-500">Min Effect</span>
            <span className="text-zinc-200">{analysis.minEffect ?? 'Auto'}</span>
          </div>
        </div>
      </div>

      {/* 2. Effect & Interval Picture */}
      <IntervalPicture
        effectValue={analysis.effectValue}
        ciLow={analysis.ciLow}
        ciHigh={analysis.ciHigh}
        ciLevel={1 - analysis.alpha}
        minEffect={analysis.minEffect ?? 0.05}
        effectName={analysis.effectName}
        verdict={analysis.verdict}
      />

      {/* 3. Statistical Power & MDE Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 space-y-2">
          <span className="text-xs font-semibold uppercase text-zinc-400 block">
            Observed p-value
          </span>
          <span
            className={`text-2xl font-mono font-extrabold ${
              analysis.pValue < analysis.alpha ? 'text-emerald-400' : 'text-zinc-200'
            }`}
          >
            {analysis.pValue < 0.0001
              ? analysis.pValue.toExponential(3)
              : analysis.pValue.toFixed(4)}
          </span>
          <p className="text-[11px] text-zinc-500">
            Probability of observing this difference under the null hypothesis
          </p>
        </div>

        <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 space-y-2">
          <span className="text-xs font-semibold uppercase text-zinc-400 block">
            Min Detectable Effect (MDE @ 80%)
          </span>
          <span className="text-2xl font-mono font-extrabold text-amber-400">
            {analysis.mde.toFixed(4)}
          </span>
          <p className="text-[11px] text-zinc-500">
            Smallest true effect this sample size was statistically powered to reveal
          </p>
        </div>

        <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 space-y-2">
          <span className="text-xs font-semibold uppercase text-zinc-400 block">
            Power Adequacy Check
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold ${
                analysis.mde <= (analysis.minEffect ?? 0.05)
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {analysis.mde <= (analysis.minEffect ?? 0.05)
                ? 'Adequately Powered'
                : 'Underpowered Sample'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            {analysis.mde <= (analysis.minEffect ?? 0.05)
              ? 'Study was large enough to reliably detect your declared minimum effect.'
              : 'Study sample was too small to rule out an effect of practical importance.'}
          </p>
        </div>
      </div>

      {/* 4. Automated Assumptions & Health Checklist */}
      <AssumptionChecklist assumptions={assumptions} />

      {/* 5. Distribution Comparison */}
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

      {/* 6. Caveats & Methodological Warnings */}
      {analysis.caveats && analysis.caveats.length > 0 && (
        <div className="bg-[#161722] border border-zinc-800/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400">
            <Info className="w-4 h-4 text-rose-400" />
            <span>Methodological Caveats & Decision Guidance</span>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {analysis.caveats.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800">
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all border border-zinc-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Run Another Experiment</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download Report (.md)</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export StatResult JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
