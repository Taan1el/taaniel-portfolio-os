import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error boundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            background: "#08111d",
            color: "rgba(232, 240, 255, 0.9)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
            <p style={{ opacity: 0.85 }}>{this.state.error.message}</p>
            <p>
              <Link to="/simple" style={{ color: "#77c7ff" }}>
                Open quick portfolio
              </Link>
              {" · "}
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#77c7ff",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => globalThis.location.reload()}
              >
                Reload
              </button>
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
