import React, { useMemo, useState } from "react";
import { Coins, Plus, Trash2 } from "lucide-react";

interface ValutaViewProps {
  currencies: Record<string, number>;
  onUpdateCurrencies?: (currencies: Record<string, number>) => void;
}

export const ValutaView: React.FC<ValutaViewProps> = ({ currencies, onUpdateCurrencies }) => {
  const [amount, setAmount] = useState("100");
  const [fromCurr, setFromCurr] = useState("EUR");
  const [toCurr, setToCurr] = useState(Object.keys(currencies)[0] || "USD");
  const [code, setCode] = useState("");
  const [rate, setRate] = useState("");
  const codes = useMemo(() => ["EUR", ...Object.keys(currencies).filter((item) => item !== "EUR").sort()], [currencies]);
  const input = Number(amount) || 0;
  const valueInEur = fromCurr === "EUR" ? input : input / (currencies[fromCurr] || 1);
  const result = toCurr === "EUR" ? valueInEur : valueInEur * (currencies[toCurr] || 1);

  const addCurrency = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const numericRate = Number(rate.replace(",", "."));
    if (!/^[A-Z]{3}$/.test(normalizedCode) || !Number.isFinite(numericRate) || numericRate <= 0) return;
    onUpdateCurrencies?.({ ...currencies, [normalizedCode]: numericRate });
    setToCurr(normalizedCode);
    setCode("");
    setRate("");
  };

  return <div className="space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-amber-600 to-[#174A7E] p-5 text-white shadow-lg sm:p-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">Handmatige koersen, offline bruikbaar</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-black"><Coins className="h-7 w-7" />Valuta</h1><p className="mt-2 text-sm text-amber-50">Voeg zelf valuta en de koers ten opzichte van 1 euro toe.</p></header>
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2"><CurrencyInput label="Bedrag van" amount={amount} onAmount={setAmount} code={fromCurr} onCode={setFromCurr} codes={codes} /><div><p className="mb-1 text-xs font-bold text-slate-500">Omgerekend naar</p><div className="flex gap-2"><div className="flex h-12 min-w-0 flex-1 items-center rounded-2xl bg-amber-50 px-4 text-lg font-black text-[#174A7E] dark:bg-slate-800 dark:text-amber-300">{result.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}</div><select value={toCurr} onChange={(event) => setToCurr(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black dark:border-slate-700 dark:bg-slate-800">{codes.map((item) => <option key={item}>{item}</option>)}</select></div></div></div>
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"><h2 className="font-black">Valuta toevoegen</h2><form onSubmit={addCurrency} className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_auto]"><input maxLength={3} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Code, bv. THB" className="h-11 rounded-xl border border-slate-200 bg-transparent px-3 text-sm uppercase dark:border-slate-700" /><input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Koers: 1 EUR = ..." className="h-11 rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /><button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#174A7E] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />Toevoegen</button></form></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(currencies).sort().map(([currencyCode, currencyRate]) => <div key={currencyCode} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-500">1 EUR</p><p className="font-black">{currencyRate.toLocaleString("nl-NL")} {currencyCode}</p></div><button type="button" onClick={() => { const next = { ...currencies }; delete next[currencyCode]; onUpdateCurrencies?.(next); if (toCurr === currencyCode) setToCurr("EUR"); }} className="rounded-lg p-2 text-slate-400 hover:text-rose-600" aria-label={`${currencyCode} verwijderen`}><Trash2 className="h-4 w-4" /></button></div>)}</div>
    </section>
  </div>;
};

const CurrencyInput = ({ label, amount, onAmount, code, onCode, codes }: { label: string; amount: string; onAmount: (value: string) => void; code: string; onCode: (value: string) => void; codes: string[] }) => <div><p className="mb-1 text-xs font-bold text-slate-500">{label}</p><div className="flex gap-2"><input type="number" inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold dark:border-slate-700 dark:bg-slate-800" /><select value={code} onChange={(event) => onCode(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black dark:border-slate-700 dark:bg-slate-800">{codes.map((item) => <option key={item}>{item}</option>)}</select></div></div>;

export default ValutaView;
