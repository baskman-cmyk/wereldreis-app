import React from 'react';
import { TabType, TripDataState } from '../types';

interface DashboardViewProps {
  data: TripDataState;
  setActiveTab: (tab: TabType) => void;
  onUpdateWidgets?: (widgets: any) => void;
  onOpenAssistant?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
}) => {
  const nextFlight = data.flights?.[0];
  const currentAccommodation = data.accommodations?.[0];
  const nextActivity = data.activities?.[0];
  const todaySummary = data.overview?.tripName ? `Overzicht voor ${data.overview.tripName}` : 'Welkom terug! Hier is je actuele reisschema.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          🗺️ Wereldreis Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          {todaySummary}
        </p>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Volgende Vlucht */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">✈️ Volgende Vlucht</span>
          {nextFlight ? (
            <div className="mt-3 space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {nextFlight.airline || 'Vlucht'} {nextFlight.flightNumber ? `(${nextFlight.flightNumber})` : ''}
              </div>
              <p className="text-xs text-slate-500">
                Van {nextFlight.departureAirport || 'Onbekend'} naar {nextFlight.arrivalAirport || 'Onbekend'}
              </p>
              <p className="text-xs text-slate-400">Vertrek: {nextFlight.departureTime || 'N.b.'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-3">Geen aankomende vluchten gevonden.</p>
          )}
        </div>

        {/* Huidige Accommodatie */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">🏨 Huidige Accommodatie</span>
          {currentAccommodation ? (
            <div className="mt-3 space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">{currentAccommodation.name}</div>
              <p className="text-xs text-slate-500">Check-out: {currentAccommodation.checkOut || 'N.b.'}</p>
              <p className="break-anywhere text-xs text-slate-400">{currentAccommodation.location || 'Geen adres'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-3">Geen actieve accommodatie voor vandaag.</p>
          )}
        </div>

        {/* Volgende Activiteit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">🎯 Volgende Activiteit</span>
          {nextActivity ? (
            <div className="mt-3 space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">{nextActivity.title || nextActivity.name}</div>
              <p className="text-xs text-slate-500">{nextActivity.date || ''} {nextActivity.location ? `- ${nextActivity.location}` : ''}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-3">Geen geplande activiteiten direct op de planning.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
