import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Play,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DEMO_DATASETS } from '../data/demos';
import { MetricType, AlternativeType, PreRegistrationDeclaration } from '../types';
import { executeAnalysis, saveAnalysisResult } from '../lib/appwrite';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoParam = searchParams.get('demo');

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Raw Data
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [source, setSource] = useState<'upload' | 'paste' | 'demo'>('upload');

  // Step 2: Column Mapping
  const [groupCol, setGroupCol] = useState<string>('');
  const [valCol, setValCol] = useState<string>('');
  const [controlVal, setControlVal] = useState<string>('');
  const [variantVal, setVariantVal] = useState<string>('');
  const [distinctGroups, setDistinctGroups] = useState<string[]>([]);

  // Step 3: Hypothesis Pre-registration
  const [experimentName, setExperimentName] = useState<string>('My A/B Experiment');
  const [hypothesisText, setHypothesisText] = useState<string>('');
  const [metricType, setMetricType] = useState<MetricType>('continuous');
  const [direction, setDirection] = useState<AlternativeType>('two-sided');
  const [alpha, setAlpha] = useState<number>(0.05);
  const [minEffect, setMinEffect] = useState<string>('0.05');
  const [expectedRatio, setExpectedRatio] = useState<number>(0.5);

  // Auto-load demo if demo param is present
  useEffect(() => {
    if (demoParam) {
      const demo = DEMO_DATASETS.find((d) => d.id === demoParam);
      if (demo) {
        setSource('demo');
        setFileName(demo.title);
        setExperimentName(demo.title);
        setMetricType(demo.metricType);
        setDirection(demo.direction);
        setAlpha(demo.alpha);
        setMinEffect(demo.minEffect.toString());
        setExpectedRatio(demo.expectedRatio);
        setHypothesisText(demo.declaredHypothesis);

        // Fetch CSV from public directory
        fetch(demo.csvFile)
          .then((res) => res.text())
          .then((text) => {
            Papa.parse(text, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                if (results.data && results.data.length > 0) {
                  setParsedData(results.data);
                  const cols = Object.keys(results.data[0] as object);
                  setColumns(cols);
                  setGroupCol(demo.groupCol);
                  setValCol(demo.valCol);
                  setControlVal(demo.controlVal);
                  setVariantVal(demo.variantVal);
                  // Set distinct groups
                  const unique = Array.from(
                    new Set(results.data.map((r: any) => String(r[demo.groupCol])))
                  );
                  setDistinctGroups(unique);
                }
              },
            });
          })
          .catch((err) => setError('Failed to load demo CSV: ' + err.message));
      }
    }
  }, [demoParam]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSource('upload');
    setError(null);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError('CSV file is empty or unreadable.');
          return;
        }
        setParsedData(results.data);
        const cols = Object.keys(results.data[0] as object);
        setColumns(cols);
        setGroupCol(cols[0] || '');
        setValCol(cols[1] || '');
      },
      error: (err) => setError('CSV Parsing error: ' + err.message),
    });
  };

  // When group column changes, update distinct group values
  useEffect(() => {
    if (parsedData.length > 0 && groupCol) {
      const unique = Array.from(
        new Set(
          parsedData
            .map((r) => r[groupCol])
            .filter((v) => v !== null && v !== undefined && v !== '')
            .map(String)
        )
      );
      setDistinctGroups(unique);
      if (unique.length >= 2) {
        if (!controlVal || !unique.includes(controlVal)) setControlVal(unique[0]);
        if (!variantVal || !unique.includes(variantVal)) setVariantVal(unique[1]);
      }
    }
  }, [groupCol, parsedData]);

  // Auto-detect metric type when outcome column changes
  useEffect(() => {
    if (parsedData.length > 0 && valCol) {
      const sampleVals = parsedData
        .slice(0, 100)
        .map((r) => r[valCol])
        .filter((v) => v !== null && v !== undefined);
      const isBinaryDetected = sampleVals.every(
        (v) => v === 0 || v === 1 || v === '0' || v === '1' || v === true || v === false
      );
      if (isBinaryDetected && !demoParam) {
        setMetricType('binary');
        setMinEffect('0.01'); // 1 percentage point default
      } else if (!demoParam) {
        setMetricType('continuous');
        setMinEffect('0.2'); // default 0.2 units
      }
    }
  }, [valCol, parsedData, demoParam]);

  // Execute and Save
  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Separate group A and B arrays
      const groupAData: number[] = [];
      const groupBData: number[] = [];

      for (const row of parsedData) {
        const grp = String(row[groupCol]);
        const val = row[valCol];
        if (val === null || val === undefined || val === '') continue;

        let numVal: number;
        if (metricType === 'binary') {
          numVal = val === 1 || val === '1' || val === true ? 1 : 0;
        } else {
          numVal = Number(val);
        }

        if (isNaN(numVal)) continue;

        if (grp === controlVal) {
          groupAData.push(numVal);
        } else if (grp === variantVal) {
          groupBData.push(numVal);
        }
      }

      const parsedMinEffect = parseFloat(minEffect) || 0.05;

      const payload = {
        metricType,
        a: groupAData,
        b: groupBData,
        labels: [controlVal, variantVal],
        alpha,
        alternative: direction,
        minEffect: parsedMinEffect,
        expectedRatio,
        seed: 42,
      };

      // 2. Call statistics engine
      const statResult = await executeAnalysis(payload);

      // 3. Save to TablesDB (with RLS permissions)
      const declaration: PreRegistrationDeclaration = {
        hypothesis: hypothesisText || `Testing if ${variantVal} differs from ${controlVal}`,
        metricType,
        direction,
        alpha,
        minEffect: parsedMinEffect,
        expectedRatio,
        labelA: controlVal,
        labelB: variantVal,
      };

      const saved = await saveAnalysisResult(declaration, statResult, {
        name: experimentName || `${controlVal} vs ${variantVal}`,
        description: `Analyzed ${groupAData.length + groupBData.length} total samples.`,
        source,
      });

      // 4. Navigate to Result Page
      navigate(`/a/${saved.analysisId}`);
    } catch (err: any) {
      setError(err.message || 'Execution error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Step Indicators */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center justify-between text-xs font-medium">
          <div
            className={`flex items-center gap-2 ${
              currentStep >= 1 ? 'text-rose-400 font-bold' : 'text-zinc-500'
            }`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
              1
            </span>
            <span>Data Ingestion</span>
          </div>

          <div className="h-px w-12 bg-zinc-800" />

          <div
            className={`flex items-center gap-2 ${
              currentStep >= 2 ? 'text-rose-400 font-bold' : 'text-zinc-500'
            }`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
              2
            </span>
            <span>Column Mapping</span>
          </div>

          <div className="h-px w-12 bg-zinc-800" />

          <div
            className={`flex items-center gap-2 ${
              currentStep >= 3 ? 'text-rose-400 font-bold' : 'text-zinc-500'
            }`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
              3
            </span>
            <span>Pre-Registration</span>
          </div>

          <div className="h-px w-12 bg-zinc-800" />

          <div
            className={`flex items-center gap-2 ${
              currentStep >= 4 ? 'text-rose-400 font-bold' : 'text-zinc-500'
            }`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
              4
            </span>
            <span>Review & Run</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Data Ingestion */}
      {currentStep === 1 && (
        <div className="bg-[#14151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Step 1: Ingest Experiment Data</h2>
            <p className="text-xs text-zinc-400">
              Upload a CSV file containing your variant group column and metric outcome values.
            </p>
          </div>

          <div className="border-2 border-dashed border-zinc-800 hover:border-rose-500/50 rounded-2xl p-8 text-center bg-zinc-900/40 transition-colors">
            <UploadCloud className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-200 mb-1">
              {fileName ? fileName : 'Upload your experiment CSV'}
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Supports continuous numbers (revenue, duration) or binary conversions (0 or 1)
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-all border border-zinc-700">
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Successfully parsed <strong>{parsedData.length.toLocaleString()} rows</strong> with{' '}
                  <strong>{columns.length} columns</strong>
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for mapping
                </span>
              </div>

              {/* Data Table Preview */}
              <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-48 text-xs font-mono">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 sticky top-0 text-zinc-400">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="py-2 px-3 border-b border-zinc-800">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30">
                        {columns.map((c) => (
                          <td key={c} className="py-1.5 px-3 whitespace-nowrap">
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              disabled={parsedData.length === 0}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md shadow-rose-500/20"
            >
              <span>Next: Map Columns</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {currentStep === 2 && (
        <div className="bg-[#14151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Step 2: Map Variables & Groups</h2>
            <p className="text-xs text-zinc-400">
              Select which column represents your test groups and which contains the metric values.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Treatment / Group Column
              </label>
              <select
                value={groupCol}
                onChange={(e) => setGroupCol(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Identifies control vs. variant</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Outcome / Metric Column
              </label>
              <select
                value={valCol}
                onChange={(e) => setValCol(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Numeric value or 0/1 binary indicator</p>
            </div>
          </div>

          {distinctGroups.length >= 2 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Identify Baseline & Treatment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Group A (Control / Baseline)</label>
                  <select
                    value={controlVal}
                    onChange={(e) => setControlVal(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    {distinctGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-rose-300 mb-1">Group B (Variant / Test)</label>
                  <select
                    value={variantVal}
                    onChange={(e) => setVariantVal(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    {distinctGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              disabled={!groupCol || !valCol || controlVal === variantVal}
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md shadow-rose-500/20"
            >
              <span>Next: Pre-Register Hypothesis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pre-registration Hypothesis */}
      {currentStep === 3 && (
        <div className="bg-[#14151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Step 3: Pre-Register Your Hypothesis
              </h2>
              <p className="text-xs text-zinc-400">
                Lock your decision criteria in advance to eliminate p-hacking and selective reporting.
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5" /> Locks on run
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Experiment Name
              </label>
              <input
                type="text"
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                placeholder="e.g. Checkout Button Coral Color"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Hypothesis Statement
              </label>
              <textarea
                rows={2}
                value={hypothesisText}
                onChange={(e) => setHypothesisText(e.target.value)}
                placeholder="Declare your prior hypothesis: What specific change are you evaluating, and why?"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Metric Type
                </label>
                <select
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value as MetricType)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="continuous">Continuous (Means/Latency)</option>
                  <option value="binary">Binary (Conversion / 0 or 1)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Directionality
                </label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as AlternativeType)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="two-sided">Two-Sided (Variant ≠ Control)</option>
                  <option value="greater">One-Sided Greater (Variant &gt; Control)</option>
                  <option value="less">One-Sided Less (Variant &lt; Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Significance Level (&alpha;)
                </label>
                <select
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value={0.05}>&alpha; = 0.05 (95% Confidence)</option>
                  <option value={0.01}>&alpha; = 0.01 (99% Confidence)</option>
                  <option value={0.1}>&alpha; = 0.10 (90% Confidence)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Smallest Meaningful Effect (minEffect)
                </label>
                <input
                  type="number"
                  step="any"
                  value={minEffect}
                  onChange={(e) => setMinEffect(e.target.value)}
                  placeholder={metricType === 'binary' ? '0.01 (1%)' : '0.2'}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Threshold for practical business significance
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Expected Traffic Split (SRM Guard)
                </label>
                <select
                  value={expectedRatio}
                  onChange={(e) => setExpectedRatio(parseFloat(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value={0.5}>50% Control / 50% Variant</option>
                  <option value={0.67}>67% Control / 33% Variant (2:1)</option>
                  <option value={0.8}>80% Control / 20% Variant (4:1)</option>
                  <option value={0.9}>90% Control / 10% Variant</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Expected allocation across groups for chi-square check
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-all shadow-md shadow-rose-500/20"
            >
              <span>Next: Review & Lock</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review and Run */}
      {currentStep === 4 && (
        <div className="bg-[#14151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Step 4: Review & Run Analysis</h2>
            <p className="text-xs text-zinc-400">
              Confirm your pre-registered declaration. Running the analysis locks these parameters and stores the result in Appwrite TablesDB.
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-bold text-white">{experimentName}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {metricType.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block text-zinc-500 uppercase text-[10px]">Baseline (A)</span>
                <span className="font-semibold text-zinc-200">{controlVal}</span>
              </div>
              <div>
                <span className="block text-zinc-500 uppercase text-[10px]">Variant (B)</span>
                <span className="font-semibold text-rose-400">{variantVal}</span>
              </div>
              <div>
                <span className="block text-zinc-500 uppercase text-[10px]">Direction</span>
                <span className="font-semibold text-zinc-200 capitalize">{direction}</span>
              </div>
              <div>
                <span className="block text-zinc-500 uppercase text-[10px]">Significance &alpha;</span>
                <span className="font-semibold text-zinc-200">{alpha}</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 font-semibold block mb-1">Locked Hypothesis:</span>
              <p className="italic">"{hypothesisText || 'Evaluating difference between treatment and control.'}"</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(3)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Statistics...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Analysis & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
