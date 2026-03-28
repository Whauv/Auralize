import { Component, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Dashboard rendering failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen px-4 py-8 text-slate-100 md:px-6">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-400/20 bg-slate-950/60 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-300">
              Rendering Error
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Something went wrong while rendering the dashboard.
            </h1>
            <p className="mt-4 text-slate-400">
              Refresh the page and try again. If it keeps happening, re-upload your data or try Live Mode again.
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
