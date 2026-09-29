import React from 'react';

import { tr } from '../i18n/index.js';

export default class StentoreErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Errore interfaccia Sténtor:', error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="stentoreErrorPanel" role="alert">
        <strong>{tr('crash.title')}</strong>
        <p>{tr('crash.message')}</p>
        <div className="stentoreErrorActions">
          {this.props.onResetCue && (
            <button type="button" className="toolButton" onClick={this.props.onResetCue}>
              {tr('crash.firstCue')}
            </button>
          )}
          <button type="button" className="toolButton" onClick={() => window.location.reload()}>
            {tr('crash.reload')}
          </button>
        </div>
        <small>{String(this.state.error?.message || this.state.error || tr('crash.unknown'))}</small>
      </div>
    );
  }
}
