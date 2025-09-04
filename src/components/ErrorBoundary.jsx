import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // This lifecycle method catches the error and updates the state
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // This lifecycle method is for logging the error information
  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#1e1e1e',
            color: '#e0e0e0',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px'
        }}>
          <h1 style={{ color: '#dc3545' }}>Oops! Something went wrong.</h1>
          <p style={{ marginTop: '20px' }}>
              Please try refreshing the page. If the problem persists, please contact support.
          </p>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;