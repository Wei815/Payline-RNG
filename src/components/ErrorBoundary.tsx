import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * 全域錯誤邊界：任何元件在渲染時拋錯都顯示錯誤畫面，而不是整個畫面變白
 *（例如曾經選到沒有遊戲實作的 Megaway）
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('畫面發生錯誤', error, info.componentStack);
  }

  private backToHome = () => {
    useGameStore.getState().clearProject();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-dashboard-border bg-dashboard-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-danger font-bold">
            <AlertTriangle size={20} />
            <span>畫面發生錯誤</span>
          </div>
          <p className="text-sm text-dashboard-text-secondary">
            目前的操作無法顯示。可以回到首頁重新選擇遊戲，或重新載入頁面。
          </p>
          <pre className="text-xs font-mono text-dashboard-text-muted bg-dashboard-inset rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => window.location.reload()}
              className="px-4 h-9 rounded-lg border border-dashboard-border text-sm text-dashboard-text-primary hover:bg-dashboard-hover"
            >
              重新載入
            </button>
            <button
              onClick={this.backToHome}
              className="px-4 h-9 rounded-lg bg-dashboard-accent text-dashboard-on-accent text-sm font-semibold hover:bg-dashboard-accent-strong"
            >
              回到首頁
            </button>
          </div>
        </div>
      </div>
    );
  }
}
