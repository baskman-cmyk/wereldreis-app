import React from 'react';
import type { BudgetDashboardData } from '../types';

interface StatistiekenViewProps {
  categoryBudgets?: any[];
  budgetDashboard?: BudgetDashboardData;
  overview?: {
    currencies?: Record<string, number> | any[];
    [key: string]: any;
  };
}

export const StatistiekenView: React.FC<StatistiekenViewProps> = ({
  categoryBudgets = [],
  budgetDashboard = {
    totalBudgetEur: 0,
    totalSpentEur: 0,
    dailyAverageEur: 0,
  },
  overview = {},
}) => {
  const totalBudget = budgetDashboard.totalBudgetEur || budgetDashboard.totalNeeded || 0;
  const totalSpent = budgetDashboard.totalSpentEur || budgetDashboard.totalSpent || 0;
  const percentageSpent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          📊 Statistieken & Budgetoptimalisatie
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Inzicht in je uitgavenpatroon, categorieverdeling en financiële voortgang tijdens de reis.
        </p>
      </div>

      {/* KPI Kaarten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totaal Budget</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            € {totalBudget.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">Ingesteld totaalbudget</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totaal Uitgegeven</span>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            € {totalSpent.toLocaleString()}
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${percentageSpent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{percentageSpent}% van het totaalbudget</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gemiddeld per dag</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            € {budgetDashboard.dailyAverageEur || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Op basis van geregistreerde uitgaven</p>
        </div>
      </div>

      {/* Categorie Uitgaven Verdeling */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Uitgaven per Categorie</h3>
        
        {categoryBudgets.length > 0 ? (
          <div className="space-y-4">
            {categoryBudgets.map((cat, idx) => {
              const spent = cat.spentEur || 0;
              const limit = cat.limitEur || 1;
              const progress = Math.min(Math.round((spent / limit) * 100), 100);

              return (
                <div key={idx} className="border-b dark:border-slate-800 pb-4 last:border-none last:pb-0">
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.category}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      € {spent} <span className="text-xs text-slate-400">/ € {limit}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Geen categorie-budgetten geconfigureerd.</p>
        )}
      </div>

      {overview?.currencies && (Array.isArray(overview.currencies) ? overview.currencies.length > 0 : Object.keys(overview.currencies).length > 0) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Valuta Overzicht</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Array.isArray(overview.currencies) ? overview.currencies : Object.entries(overview.currencies).map(([code, rate]) => ({ code, rate }))).map((curr: any, idx: number) => (
              <div key={idx} className="border dark:border-slate-800 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-400 font-bold">{curr.code || curr.name}</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{curr.rate || '1.0'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
