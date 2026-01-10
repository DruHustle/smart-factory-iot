import { Component, ReactNode } from "react";
import ComingSoon from "@/pages/ComingSoon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches errors in child components and displays a Coming Soon page
 * instead of crashing the entire application.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error("Error caught by boundary:", error);
    console.error("Error info:", errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ComingSoon
          error={this.state.error || undefined}
          resetError={this.resetError}
          isDevelopment={process.env.NODE_ENV === "development"}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
