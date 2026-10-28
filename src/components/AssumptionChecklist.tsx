import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { AssumptionCheck } from '../types';

interface AssumptionChecklistProps {
  assumptions: AssumptionCheck[];
}

export const AssumptionChecklist: React.FC<AssumptionChecklistProps> = ({ assumptions }) => {
  if (!assumptions || assumptions.length === 0) return null;

  return (
    <div className="bg-[#14151c] border border-zinc-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-rose-400" />
        <h4 className="text-sm font-semibold text-zinc-100">
          Statistical Assumptions & Data Health Checklist
        </h4>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 ml-auto">
          Automated Verification
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider">
              <th className="py-2.5 px-3">Assumption</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Details & Observed Statistics</th>
              <th className="py-2.5 px-3">Engine Action Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {assumptions.map((check, idx) => {
              const isActionTaken = check.actionTaken && check.actionTaken.toLowerCase() !== 'none';
              return (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-zinc-200 whitespace-nowrap">
                    {check.name}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {check.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Passed
                      </span>
                    ) : check.name.includes('SRM') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" />
                        Critical Fail
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Violated
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-zinc-300 font-mono text-[11px] max-w-md">
                    {check.detail}
                  </td>
                  <td className="py-3 px-3 text-zinc-400">
                    {isActionTaken ? (
                      <span className="text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {check.actionTaken}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic">None required</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
