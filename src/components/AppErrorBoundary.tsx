import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Onverwachte fout in de reisapp", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#FAF9F5] p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto mt-20 max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-xl dark:border-rose-900/50 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black">Deze pagina kon niet worden geladen</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Je opgeslagen reisgegevens blijven behouden. Herlaad de app om opnieuw te proberen.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#174A7E] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#123d69]"
          >
            <RefreshCw className="h-4 w-4" />
            App opnieuw laden
          </button>
        </div>
      </div>
    );
  }
}
