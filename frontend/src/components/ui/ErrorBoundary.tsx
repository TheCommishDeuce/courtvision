import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-center py-20 px-4">
          <div className="ba-display text-[var(--mute)] mb-4">Error</div>
          <p className="text-[var(--ink-2)] font-medium mb-1">Something went wrong loading this page.</p>
          <p className="text-xs text-[var(--mute)] ba-mono mb-6 max-w-md mx-auto">{this.state.error.message}</p>
          <a href="/" className="ba-link font-medium text-sm">← Back to home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
