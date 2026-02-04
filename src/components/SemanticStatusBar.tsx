type SemanticSummary = {
  usedLookups: string[];
  semanticCoverage: number;
  approxTokens: number;
  costSaved: number;
  costSavedPerThousand: number;
};

type SemanticStatusBarProps = {
  summary: SemanticSummary;
};

export function SemanticStatusBar({ summary }: SemanticStatusBarProps) {
  const percent = Math.round(summary.semanticCoverage * 100);
  const usedLookups =
    summary.usedLookups.length > 0 ? summary.usedLookups : ["None"];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Semantic Lookup
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {usedLookups.map((lookup) => (
            <span
              key={lookup}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
            >
              {lookup}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div className="text-xs uppercase text-slate-400">Semantic %</div>
          <div className="text-base font-semibold text-slate-800">
            {percent}%
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div className="text-xs uppercase text-slate-400">Est. tokens</div>
          <div className="text-base font-semibold text-slate-800">
            {formatNumber(summary.approxTokens)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div className="text-xs uppercase text-slate-400">
            Est. cost saved
          </div>
          <div className="text-base font-semibold text-slate-800">
            {formatCurrency(summary.costSaved)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div className="text-xs uppercase text-slate-400">Est. / 1k uses</div>
          <div className="text-base font-semibold text-slate-800">
            {formatCurrency(summary.costSavedPerThousand)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
