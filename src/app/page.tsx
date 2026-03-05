'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  CommissionPlan,
  CommissionTier,
  calculateCommission,
  createId,
  PRESETS,
} from '@/lib/commission';
import { formatCurrency, formatPercent } from '@/lib/format';

const DEFAULT_PLAN: CommissionPlan = PRESETS['Standard Tiered']();

export default function Home() {
  const [plan, setPlan] = useState<CommissionPlan>(DEFAULT_PLAN);
  const [dealAmount, setDealAmount] = useState<number>(350000);
  const [activePreset, setActivePreset] = useState<string>('Standard Tiered');

  const result = useMemo(() => calculateCommission(plan, dealAmount), [plan, dealAmount]);

  const updatePlan = useCallback((updates: Partial<CommissionPlan>) => {
    setPlan(prev => ({ ...prev, ...updates }));
    setActivePreset('');
  }, []);

  const updateTier = useCallback((id: string, updates: Partial<CommissionTier>) => {
    setPlan(prev => ({
      ...prev,
      tiers: prev.tiers.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
    setActivePreset('');
  }, []);

  const addTier = useCallback(() => {
    setPlan(prev => {
      const lastTier = prev.tiers[prev.tiers.length - 1];
      const newMin = lastTier ? (lastTier.maxRevenue ?? lastTier.minRevenue + 100000) : 0;
      return {
        ...prev,
        tiers: [
          ...prev.tiers,
          { id: createId(), minRevenue: newMin, maxRevenue: null, rate: 10 },
        ],
      };
    });
    setActivePreset('');
  }, []);

  const removeTier = useCallback((id: string) => {
    setPlan(prev => ({
      ...prev,
      tiers: prev.tiers.filter(t => t.id !== id),
    }));
    setActivePreset('');
  }, []);

  const loadPreset = useCallback((name: string) => {
    const factory = PRESETS[name];
    if (factory) {
      setPlan(factory());
      setActivePreset(name);
    }
  }, []);

  const maxCommissionForChart = useMemo(() => {
    // Calculate max commission for the chart scale
    const testAmounts = [250000, 500000, 750000, 1000000, 1500000, 2000000];
    return Math.max(...testAmounts.map(a => calculateCommission(plan, a).totalCommission), 1);
  }, [plan]);

  const chartPoints = useMemo(() => {
    const maxDeal = Math.max(dealAmount * 1.5, plan.quota * 1.5, 1000000);
    const steps = 50;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const amount = (maxDeal / steps) * i;
      const r = calculateCommission(plan, amount);
      return { amount, commission: r.totalCommission, effectiveRate: r.effectiveRate };
    });
  }, [plan, dealAmount]);

  const exportJSON = useCallback(() => {
    const data = JSON.stringify(plan, null, 2);
    navigator.clipboard.writeText(data);
  }, [plan]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Commission Builder</h1>
            <p className="text-sm text-zinc-500">Design and simulate commission structures</p>
          </div>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors border border-zinc-700"
          >
            Copy JSON
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Plan Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <section>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map(name => (
                <button
                  key={name}
                  onClick={() => loadPreset(name)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${
                    activePreset === name
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>

          {/* Plan Settings */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Plan Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Plan Name">
                <input
                  type="text"
                  value={plan.name}
                  onChange={e => updatePlan({ name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
              <Field label="Base Salary">
                <CurrencyInput value={plan.baseSalary} onChange={v => updatePlan({ baseSalary: v })} />
              </Field>
              <Field label="OTE">
                <CurrencyInput value={plan.ote} onChange={v => updatePlan({ ote: v })} />
              </Field>
              <Field label="Quota">
                <CurrencyInput value={plan.quota} onChange={v => updatePlan({ quota: v })} />
              </Field>
            </div>
            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={plan.mode === 'marginal'}
                  onChange={() => updatePlan({ mode: 'marginal' })}
                  className="accent-indigo-500"
                />
                <span>Marginal (tax-bracket)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={plan.mode === 'flat'}
                  onChange={() => updatePlan({ mode: 'flat' })}
                  className="accent-indigo-500"
                />
                <span>Flat (whole-deal)</span>
              </label>
            </div>
          </section>

          {/* Tiers */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Commission Tiers</h2>
              <button
                onClick={addTier}
                className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
              >
                + Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {plan.tiers.map((tier, i) => (
                <div
                  key={tier.id}
                  className="grid grid-cols-[1fr_1fr_0.8fr_1.2fr_auto] gap-3 items-end"
                >
                  <Field label={i === 0 ? 'From' : undefined}>
                    <CurrencyInput
                      value={tier.minRevenue}
                      onChange={v => updateTier(tier.id, { minRevenue: v })}
                    />
                  </Field>
                  <Field label={i === 0 ? 'To' : undefined}>
                    <input
                      type="text"
                      value={tier.maxRevenue === null ? '∞' : formatCurrency(tier.maxRevenue)}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updateTier(tier.id, {
                          maxRevenue: val === '' ? null : parseInt(val),
                        });
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </Field>
                  <Field label={i === 0 ? 'Rate' : undefined}>
                    <div className="relative">
                      <input
                        type="number"
                        value={tier.rate}
                        onChange={e => updateTier(tier.id, { rate: parseFloat(e.target.value) || 0 })}
                        step={0.5}
                        min={0}
                        max={100}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                    </div>
                  </Field>
                  <Field label={i === 0 ? 'Label' : undefined}>
                    <input
                      type="text"
                      value={tier.label || ''}
                      onChange={e => updateTier(tier.id, { label: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-600"
                    />
                  </Field>
                  <button
                    onClick={() => removeTier(tier.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Remove tier"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Chart */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Commission Curve</h2>
            <CommissionChart
              points={chartPoints}
              dealAmount={dealAmount}
              quota={plan.quota}
              currentCommission={result.totalCommission}
            />
          </section>
        </div>

        {/* Right Column — Calculator */}
        <div className="space-y-6">
          {/* Deal Input */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Simulate Deal</h2>
            <Field label="Deal / Revenue Amount">
              <CurrencyInput value={dealAmount} onChange={setDealAmount} />
            </Field>
            <input
              type="range"
              min={0}
              max={Math.max(plan.quota * 2, 2000000)}
              step={10000}
              value={dealAmount}
              onChange={e => setDealAmount(parseInt(e.target.value))}
              className="w-full mt-3 accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>$0</span>
              <span>{formatCurrency(Math.max(plan.quota * 2, 2000000))}</span>
            </div>
          </section>

          {/* Results */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Results</h2>

            <div className="grid grid-cols-2 gap-4">
              <ResultCard label="Commission" value={formatCurrency(result.totalCommission)} accent />
              <ResultCard label="Total Earnings" value={formatCurrency(result.totalEarnings)} />
              <ResultCard label="Effective Rate" value={formatPercent(result.effectiveRate)} />
              <ResultCard label="Quota Attainment" value={formatPercent(result.quotaAttainment)} />
            </div>

            {/* Breakdown */}
            {result.breakdowns.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Breakdown</h3>
                <div className="space-y-2">
                  {result.breakdowns.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tierColor(i) }}
                        />
                        <span className="text-zinc-400">
                          {b.tier.label || `Tier ${i + 1}`}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          {formatPercent(b.tier.rate)}
                        </span>
                      </div>
                      <span className="font-mono">{formatCurrency(b.commission)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earnings bar */}
            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Earnings Split</h3>
              <div className="h-6 rounded-full overflow-hidden bg-zinc-800 flex">
                <div
                  className="bg-zinc-600 transition-all"
                  style={{ width: `${(plan.baseSalary / result.totalEarnings) * 100}%` }}
                  title={`Base: ${formatCurrency(plan.baseSalary)}`}
                />
                <div
                  className="bg-indigo-500 transition-all"
                  style={{ width: `${(result.totalCommission / result.totalEarnings) * 100}%` }}
                  title={`Commission: ${formatCurrency(result.totalCommission)}`}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Base {formatCurrency(plan.baseSalary)}</span>
                <span>Commission {formatCurrency(result.totalCommission)}</span>
              </div>
            </div>
          </section>

          {/* OTE gauge */}
          {plan.ote > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">vs OTE</h2>
              <div className="text-center">
                <div className="text-3xl font-semibold">
                  {formatPercent((result.totalEarnings / plan.ote) * 100)}
                </div>
                <div className="text-sm text-zinc-500">
                  of {formatCurrency(plan.ote)} OTE
                </div>
                <div className="h-2 rounded-full bg-zinc-800 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      result.totalEarnings >= plan.ote ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min((result.totalEarnings / plan.ote) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs text-zinc-500 mb-1">{label}</label>}
      {children}
    </div>
  );
}

function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  return (
    <input
      type="text"
      value={focused ? raw : formatCurrency(value)}
      onFocus={() => {
        setFocused(true);
        setRaw(value.toString());
      }}
      onBlur={() => {
        setFocused(false);
        onChange(parseFloat(raw.replace(/[^0-9.]/g, '')) || 0);
      }}
      onChange={e => setRaw(e.target.value)}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
    />
  );
}

function ResultCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold font-mono ${accent ? 'text-indigo-400' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function tierColor(i: number): string {
  const colors = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];
  return colors[i % colors.length];
}

function CommissionChart({
  points,
  dealAmount,
  quota,
  currentCommission,
}: {
  points: { amount: number; commission: number; effectiveRate: number }[];
  dealAmount: number;
  quota: number;
  currentCommission: number;
}) {
  const W = 700;
  const H = 250;
  const PAD = { top: 10, right: 20, bottom: 30, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxAmount = points[points.length - 1]?.amount || 1;
  const maxCommission = Math.max(...points.map(p => p.commission), 1);

  const x = (amount: number) => PAD.left + (amount / maxAmount) * chartW;
  const y = (commission: number) => PAD.top + chartH - (commission / maxCommission) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.amount)} ${y(p.commission)}`)
    .join(' ');

  const areaD = pathD + ` L ${x(points[points.length - 1].amount)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const dealX = x(dealAmount);
  const dealY = y(currentCommission);
  const quotaX = x(Math.min(quota, maxAmount));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line
            x1={PAD.left}
            y1={PAD.top + chartH * (1 - f)}
            x2={W - PAD.right}
            y2={PAD.top + chartH * (1 - f)}
            stroke="#27272a"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={PAD.top + chartH * (1 - f) + 4}
            textAnchor="end"
            className="fill-zinc-600"
            fontSize={10}
          >
            {formatCurrency(maxCommission * f)}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text
          key={f}
          x={PAD.left + chartW * f}
          y={H - 5}
          textAnchor="middle"
          className="fill-zinc-600"
          fontSize={10}
        >
          {formatCurrency(maxAmount * f)}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#gradient)" opacity={0.3} />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} />

      {/* Quota line */}
      {quota > 0 && quota <= maxAmount && (
        <>
          <line
            x1={quotaX}
            y1={PAD.top}
            x2={quotaX}
            y2={PAD.top + chartH}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={quotaX}
            y={PAD.top - 2}
            textAnchor="middle"
            className="fill-amber-500"
            fontSize={9}
          >
            Quota
          </text>
        </>
      )}

      {/* Current deal marker */}
      <line
        x1={dealX}
        y1={PAD.top}
        x2={dealX}
        y2={PAD.top + chartH}
        stroke="#818cf8"
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.5}
      />
      <circle cx={dealX} cy={dealY} r={5} fill="#818cf8" stroke="#1e1b4b" strokeWidth={2} />

      {/* Gradient def */}
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}
