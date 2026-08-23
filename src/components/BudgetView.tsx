import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Car,
  ChevronDown,
  CircleAlert,
  Coins,
  Database,
  FileText,
  Fuel,
  Gift,
  Globe2,
  Home,
  Hotel,
  Luggage,
  PiggyBank,
  Plane,
  Pencil,
  Plus,
  ReceiptText,
  Shield,
  Shirt,
  ShoppingCart,
  Tent,
  Ticket,
  Trash2,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  BudgetCategory,
  BudgetCategoryGroup,
  BudgetDashboard,
  BudgetDashboardLine,
  CountryBudgetGroup,
  Expense,
} from "../types";

interface BudgetViewProps {
  expenses?: Expense[];
  categoryBudgets?: BudgetCategory[];
  budgetDashboard?: BudgetDashboard;
  onAddExpense?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  onUpdateExpense?: (expense: Expense) => void;
}

type BudgetTab = "categories" | "countries" | "expenses";
type IconComponent = React.ComponentType<{ className?: string }>;

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const iconByName: Record<string, IconComponent> = {
  thuis: Home,
  home: Home,
  vluchten: Plane,
  plane: Plane,
  vervoer: Car,
  car: Car,
  brandstof: Fuel,
  fuel: Fuel,
  hotels: Hotel,
  hotel: Hotel,
  campings: Tent,
  tent: Tent,
  boodschappen: ShoppingCart,
  "shopping-cart": ShoppingCart,
  shoppingcart: ShoppingCart,
  eten: Utensils,
  utensils: Utensils,
  activiteiten: Ticket,
  ticket: Ticket,
  verzekeringen: Shield,
  shield: Shield,
  visa: FileText,
  filetext: FileText,
  overig: Luggage,
  luggage: Luggage,
  kleding: Shirt,
  shirt: Shirt,
  souvenirs: Gift,
  gift: Gift,
  onvoorzien: CircleAlert,
  circlealert: CircleAlert,
  coins: Coins,
};

const countryFlag = (country: string) => {
  const key = country.toLowerCase();
  if (key.includes("usa") || key.includes("verenigde staten")) return "🇺🇸";
  if (key.includes("fiji")) return "🇫🇯";
  if (key.includes("australi")) return "🇦🇺";
  if (key.includes("nieuw-zeeland")) return "🇳🇿";
  if (key.includes("thailand") || key.includes("singapore") || key.includes("doha")) return "🌏";
  if (key.includes("tanzania")) return "🇹🇿";
  return "🌍";
};

const amountForLine = (line: BudgetDashboardLine) => line.amountEur ?? line.amount ?? 0;

const SourceLines: React.FC<{ lines: BudgetDashboardLine[] }> = ({ lines }) => {
  if (!lines.length) {
    return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">Geen verdere uitsplitsing beschikbaar.</p>;
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
      {lines.map((line, index) => {
        const actual = line.kind === "actual" || line.type === "actual";
        return (
          <div key={`${line.source || "line"}-${line.label}-${index}`} className="grid gap-2 bg-white px-3 py-3 text-sm dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${actual ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                  {actual ? "Betaald" : "Begroot"}
                </span>
                {line.country && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{line.country}</span>}
              </div>
              <p className="mt-1 break-anywhere font-semibold text-slate-800 dark:text-slate-100">{line.label}</p>
              {line.source && <p className="mt-0.5 break-anywhere text-xs text-slate-500 dark:text-slate-400">Bron: {line.source}</p>}
            </div>
            <strong className="text-slate-900 dark:text-white">{euro.format(amountForLine(line))}</strong>
          </div>
        );
      })}
    </div>
  );
};

const Progress: React.FC<{ planned: number; actual: number }> = ({ planned, actual }) => {
  const percentage = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0;
  const overBudget = percentage > 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>{Math.round(percentage)}% gebruikt</span>
        <span>{euro.format(Math.max(0, planned - actual))} vrij</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${overBudget ? "bg-rose-500" : "bg-[#39B8C8]"}`} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
};

const CategoryCard: React.FC<{ group: BudgetCategoryGroup; iconName?: string }> = ({ group, iconName }) => {
  const Icon = iconByName[(iconName || group.category).toLowerCase().replace(/\s+/g, "")] || Coins;
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 marker:content-none sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#174A7E]/10 text-[#174A7E] dark:bg-cyan-950/50 dark:text-[#39B8C8]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-anywhere font-black text-slate-900 dark:text-white">{group.label}</span>
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{group.sourceLines.length} onderdelen</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-black text-slate-900 dark:text-white">{euro.format(group.plannedEur)}</span>
          <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-300">{euro.format(group.actualEur)} betaald</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
        <Progress planned={group.plannedEur} actual={group.actualEur} />
        <h4 className="mb-2 mt-5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Begroting en betalingen</h4>
        <SourceLines lines={group.sourceLines} />
      </div>
    </details>
  );
};

export const BudgetView: React.FC<BudgetViewProps> = ({ expenses = [], categoryBudgets = [], budgetDashboard, onAddExpense: addExpense, onDeleteExpense, onUpdateExpense }) => {
  const [activeTab, setActiveTab] = useState<BudgetTab>("categories");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string>();
  const [expenseDraft, setExpenseDraft] = useState({ date: new Date().toISOString().slice(0, 10), description: "", category: categoryBudgets[0]?.category || "overig", amount: "", country: "", paidBy: "", notes: "" });
  const onAddExpense = (expense: Expense) => {
    if (editingExpenseId) onUpdateExpense?.({ ...expense, id: editingExpenseId });
    else addExpense?.(expense);
    setEditingExpenseId(undefined);
  };

  const categoryGroups = useMemo<BudgetCategoryGroup[]>(() => {
    if (budgetDashboard?.globalCategoryGroups?.length) return budgetDashboard.globalCategoryGroups;
    return categoryBudgets.map((category) => {
      const actualLines: BudgetDashboardLine[] = expenses
        .filter((expense) => expense.category === category.category)
        .map((expense) => ({
          label: expense.description || expense.title || category.label || category.category,
          amountEur: expense.amountEur,
          source: expense.date,
          country: expense.country,
          category: expense.category,
          kind: "actual",
        }));
      return {
        category: category.category,
        label: category.label || category.name || category.category,
        plannedEur: category.budgetEur ?? category.limit ?? 0,
        actualEur: category.spentEur ?? category.spent ?? 0,
        sourceLines: [...(category.sourceLines || []), ...actualLines],
      };
    });
  }, [budgetDashboard?.globalCategoryGroups, categoryBudgets, expenses]);

  const countryGroups = useMemo<CountryBudgetGroup[]>(() => {
    if (budgetDashboard?.countryGroups?.length) return budgetDashboard.countryGroups;
    const countries = Array.from(new Set(expenses.map((expense) => expense.country).filter(Boolean))) as string[];
    return countries.map((country) => {
      const countryExpenses = expenses.filter((expense) => expense.country === country);
      const categories = Array.from(new Set(countryExpenses.map((expense) => expense.category))).map((category) => {
        const categoryExpenses = countryExpenses.filter((expense) => expense.category === category);
        return {
          category,
          label: categoryBudgets.find((item) => item.category === category)?.label || category,
          plannedEur: 0,
          actualEur: categoryExpenses.reduce((sum, expense) => sum + expense.amountEur, 0),
          sourceLines: categoryExpenses.map((expense) => ({
            label: expense.description || expense.title || category,
            amountEur: expense.amountEur,
            source: expense.date,
            country,
            category,
            kind: "actual" as const,
          })),
        };
      });
      return {
        country,
        days: 0,
        dailyBudgetEur: 0,
        plannedEur: categories.reduce((sum, category) => sum + category.plannedEur, 0),
        actualEur: categories.reduce((sum, category) => sum + category.actualEur, 0),
        categories,
      };
    });
  }, [budgetDashboard?.countryGroups, categoryBudgets, expenses]);

  const fallbackBudget = categoryGroups.reduce((sum, category) => sum + category.plannedEur, 0);
  const fallbackPaid = categoryGroups.reduce((sum, category) => sum + category.actualEur, 0);
  const totalNeeded = budgetDashboard?.totalNeededEur ?? budgetDashboard?.totalNeeded ?? budgetDashboard?.totalBudget ?? fallbackBudget;
  const totalPaid = budgetDashboard?.alreadyPaidEur ?? budgetDashboard?.totalPaid ?? budgetDashboard?.totalSpent ?? fallbackPaid;
  const funding = budgetDashboard?.fundingTotalEur ?? budgetDashboard?.totalAvailable ?? budgetDashboard?.funding ?? 0;
  const remaining = Math.max(0, totalNeeded - totalPaid);
  const coverage = budgetDashboard?.fundingDifferenceEur ?? (funding ? funding - totalNeeded : remaining);
  const breakdown = [
    { label: "Thuis tijdens reis", value: budgetDashboard?.homeCostsEur ?? budgetDashboard?.homeCosts, icon: Home },
    { label: "Voor vertrek", value: budgetDashboard?.upfrontCostsEur ?? budgetDashboard?.preTripCosts, icon: Luggage },
    { label: "Onderweg", value: budgetDashboard?.travelCostsEur ?? budgetDashboard?.travelCosts, icon: Globe2 },
    { label: "Onvoorzien", value: budgetDashboard?.contingencyEur ?? budgetDashboard?.contingency, icon: Shield },
  ].filter((item) => item.value !== undefined);

  const tabs: Array<{ id: BudgetTab; label: string; count: number; icon: IconComponent }> = [
    { id: "categories", label: "Categorieën", count: categoryGroups.length, icon: PiggyBank },
    { id: "countries", label: "Per land", count: countryGroups.length, icon: Globe2 },
    { id: "expenses", label: "Betalingen", count: expenses.length, icon: ReceiptText },
  ];

  return (
    <section className="space-y-4 sm:space-y-5" aria-labelledby="budget-title">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#174A7E] via-[#17667C] to-[#39B8C8] p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Wallet className="h-6 w-6" /></div>
            <h2 id="budget-title" className="text-2xl font-black sm:text-3xl">Reisbudget</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-cyan-50 sm:text-base">Van totaaloverzicht naar iedere begrotings- en betalingsregel.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-cyan-50">
            <Database className="h-4 w-4 shrink-0" />
            <span className="break-anywhere">{budgetDashboard?.sourceSheet ? `Excel-bron: ${budgetDashboard.sourceSheet}` : "Actuele dashboardgegevens"}</span>
          </div>
        </div>
        {addExpense && <button type="button" onClick={() => { setEditingExpenseId(undefined); setExpenseDraft({ date: new Date().toISOString().slice(0, 10), description: "", category: categoryBudgets[0]?.category || "overig", amount: "", country: "", paidBy: "", notes: "" }); setShowExpenseForm(true); }} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#174A7E]"><Plus className="h-4 w-4" />Kosten toevoegen</button>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Totaal nodig", value: totalNeeded, icon: Wallet, color: "text-[#174A7E] dark:text-cyan-300" },
          { label: "Al betaald", value: totalPaid, icon: BadgeCheck, color: "text-emerald-600 dark:text-emerald-300" },
          { label: "Nog te betalen", value: remaining, icon: ReceiptText, color: "text-amber-600 dark:text-amber-300" },
          { label: funding ? "Ruimte in financiering" : "Nog beschikbaar", value: coverage, icon: PiggyBank, color: coverage < 0 ? "text-rose-600 dark:text-rose-300" : "text-violet-600 dark:text-violet-300" },
        ].map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><Icon className={`h-4 w-4 ${color}`} />{label}</div>
            <p className={`mt-3 break-anywhere text-xl font-black sm:text-2xl ${color}`}>{euro.format(value)}</p>
          </article>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {breakdown.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#174A7E] shadow-sm dark:bg-slate-900 dark:text-[#39B8C8]"><Icon className="h-5 w-5" /></span>
              <span><span className="block text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span><strong className="block text-slate-900 dark:text-white">{euro.format(value || 0)}</strong></span>
            </div>
          ))}
        </div>
      )}

      {(budgetDashboard?.paidBreakdown?.length || budgetDashboard?.fundingLines?.length) && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-emerald-600" /><h3 className="font-black">Totaal al betaald</h3><strong className="ml-auto text-emerald-700 dark:text-emerald-300">{euro.format(totalPaid)}</strong></div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {(budgetDashboard?.paidBreakdown || []).map((line) => <div key={line.label} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="text-slate-600 dark:text-slate-300">{line.label}</span><strong>{euro.format(line.amountEur)}</strong></div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-violet-600" /><h3 className="font-black">Bekostiging reis</h3><strong className="ml-auto text-violet-700 dark:text-violet-300">{euro.format(funding)}</strong></div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {(budgetDashboard?.fundingLines || []).map((line) => <div key={line.label} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="text-slate-600 dark:text-slate-300">{line.label}</span><strong>{euro.format(line.amountEur)}</strong></div>)}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2.5 text-sm dark:bg-violet-950/30"><span className="font-bold text-violet-800 dark:text-violet-200">Verschil na totaal benodigd</span><strong className="text-violet-800 dark:text-violet-200">{euro.format(coverage)}</strong></div>
          </section>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid min-w-[34rem] grid-cols-3 gap-1" role="tablist" aria-label="Budgetweergave">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition ${activeTab === id ? "bg-[#174A7E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              <Icon className="h-4 w-4" />{label}<span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === id ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "categories" && (
        <div role="tabpanel" className="grid gap-3 lg:grid-cols-2">
          {categoryGroups.map((group) => (
            <CategoryCard key={group.category} group={group} iconName={categoryBudgets.find((item) => item.category === group.category)?.iconName} />
          ))}
        </div>
      )}

      {activeTab === "countries" && (
        <div role="tabpanel" className="grid gap-3 lg:grid-cols-2">
          {countryGroups.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:col-span-2">Importeer de Excelbegroting om het budget per land te zien.</p>}
          {countryGroups.map((country) => (
            <details key={country.country} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 marker:content-none sm:p-5">
                <span className="text-3xl" aria-hidden="true">{countryFlag(country.country)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-anywhere font-black text-slate-900 dark:text-white">{country.country}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{country.days || "—"} dagen{country.dailyBudgetEur ? ` · ${euro.format(country.dailyBudgetEur)} per dag` : ""}</span>
                </span>
                <span className="shrink-0 text-right"><strong className="block text-slate-900 dark:text-white">{euro.format(country.plannedEur)}</strong><span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{euro.format(country.actualEur)} betaald</span></span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
                <Progress planned={country.plannedEur} actual={country.actualEur} />
                {country.categories.map((category) => (
                  <details key={category.category} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-slate-50 px-3 py-2 marker:content-none dark:bg-slate-800/60">
                      <span className="min-w-0 flex-1 break-anywhere text-sm font-black text-slate-800 dark:text-slate-100">{category.label}</span>
                      <span className="shrink-0 text-right text-xs"><strong className="block">{euro.format(category.plannedEur)}</strong><span className="text-emerald-700 dark:text-emerald-300">{euro.format(category.actualEur)}</span></span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </summary>
                    <div className="p-3"><SourceLines lines={category.sourceLines} /></div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {activeTab === "expenses" && (
        <div role="tabpanel" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {expenses.length === 0 && <p className="p-8 text-center text-slate-500 dark:text-slate-400">Nog geen betalingen geregistreerd.</p>}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...expenses].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((expense) => {
              const parsedDate = expense.date ? new Date(`${expense.date}T12:00:00`) : undefined;
              return (
                <article key={expense.id} className="grid gap-2 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><BadgeCheck className="h-5 w-5" /></span>
                  <div>
                    <p className="break-anywhere font-bold text-slate-900 dark:text-white">{expense.description || expense.title || expense.category}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{parsedDate && !Number.isNaN(parsedDate.getTime()) ? dateFormat.format(parsedDate) : expense.date || "Datum onbekend"} · {expense.category}{expense.country ? ` · ${expense.country}` : ""}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end"><strong className="text-slate-900 dark:text-white">{euro.format(expense.amountEur ?? expense.amountOriginal ?? 0)}</strong>{onUpdateExpense && <button type="button" onClick={() => { setEditingExpenseId(expense.id); setExpenseDraft({ date: expense.date || "", description: expense.description || expense.title || "", category: expense.category, amount: String(expense.amountEur ?? expense.amountOriginal ?? ""), country: expense.country || "", paidBy: expense.paidBy || "", notes: expense.notes || "" }); setShowExpenseForm(true); }} className="rounded-lg p-2 text-[#174A7E]" aria-label="Kosten aanpassen"><Pencil className="h-4 w-4" /></button>}{onDeleteExpense && <button type="button" onClick={() => window.confirm(`Kosten “${expense.description || expense.title || expense.category}” verwijderen?`) && onDeleteExpense(expense.id)} className="rounded-lg p-2 text-rose-600" aria-label="Kosten verwijderen"><Trash2 className="h-4 w-4" /></button>}</div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {showExpenseForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center"><form onSubmit={(event) => { event.preventDefault(); const amount = Number(String(expenseDraft.amount).replace(",", ".")); if (!expenseDraft.description.trim() || !Number.isFinite(amount) || amount <= 0) return; onAddExpense?.({ id: `expense-${Date.now()}`, date: expenseDraft.date, description: expenseDraft.description.trim(), category: expenseDraft.category, amountEur: amount, amountOriginal: amount, currency: "EUR", country: expenseDraft.country.trim() || undefined, paidBy: expenseDraft.paidBy.trim() || undefined, notes: expenseDraft.notes.trim() || undefined }); setExpenseDraft({ date: new Date().toISOString().slice(0, 10), description: "", category: categoryBudgets[0]?.category || "overig", amount: "", country: "", paidBy: "", notes: "" }); setShowExpenseForm(false); setActiveTab("expenses"); }} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Kosten toevoegen</h2><button type="button" onClick={() => setShowExpenseForm(false)} className="rounded-full p-2"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Datum<input type="date" required value={expenseDraft.date} onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })} className="field mt-1" /></label><label className="text-sm font-bold">Bedrag in euro<input inputMode="decimal" required value={expenseDraft.amount} onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: e.target.value })} className="field mt-1" placeholder="0,00" /></label><label className="text-sm font-bold sm:col-span-2">Omschrijving<input required value={expenseDraft.description} onChange={(e) => setExpenseDraft({ ...expenseDraft, description: e.target.value })} className="field mt-1" /></label><label className="text-sm font-bold">Categorie<select value={expenseDraft.category} onChange={(e) => setExpenseDraft({ ...expenseDraft, category: e.target.value })} className="field mt-1">{categoryBudgets.map((category) => <option key={category.category} value={category.category}>{category.label || category.category}</option>)}<option value="overig">Overig</option></select></label><label className="text-sm font-bold">Land<input value={expenseDraft.country} onChange={(e) => setExpenseDraft({ ...expenseDraft, country: e.target.value })} className="field mt-1" /></label><label className="text-sm font-bold">Betaald door<input value={expenseDraft.paidBy} onChange={(e) => setExpenseDraft({ ...expenseDraft, paidBy: e.target.value })} className="field mt-1" /></label><label className="text-sm font-bold">Notities<input value={expenseDraft.notes} onChange={(e) => setExpenseDraft({ ...expenseDraft, notes: e.target.value })} className="field mt-1" /></label></div><button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#174A7E] text-sm font-black text-white">Opslaan</button></form></div>}
    </section>
  );
};

export default BudgetView;
