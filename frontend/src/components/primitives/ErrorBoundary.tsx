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
          <div className="ba-display text-mute mb-4">Error</div>
          <p className="ba-body text-ink-2 font-medium mb-1">Something went wrong loading this page.</p>
          <p className="ba-mono ba-meta text-mute mb-6 max-w-md mx-auto">{this.state.error.message}</p>
          <a href="/" className="ba-link ba-cell font-medium">← Back to home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
