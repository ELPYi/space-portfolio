import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './context/GameContext';
import { I18nProvider } from './context/I18nContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>
  </React.StrictMode>,
);
