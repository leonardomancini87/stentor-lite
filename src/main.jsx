import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/app.css';
import './styles/regiaClarity.css';
import './styles/regia11.css';
import './styles/regiaSkin.css';

createRoot(document.getElementById('root')).render(<App />);

// App desktop: la finestra nasce nascosta e si mostra solo ora, a interfaccia disegnata e
// caratteri caricati (al massimo dopo 800 ms). Timer e non requestAnimationFrame, che in una
// finestra nascosta può non partire.
if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
  const showWindow = () => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('stentor_window_ready'))
      .catch(() => {});
  };
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 800))])
    .then(() => setTimeout(showWindow, 50));
}
