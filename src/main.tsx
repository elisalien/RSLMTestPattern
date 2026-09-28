import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
import App from './App';
import { assets } from './state/assets';
import { useStore } from './state/store';

// Handy for debugging from the console
(window as unknown as { mires: typeof useStore }).mires = useStore;

// Canvas text needs the web font loaded before the first render
Promise.allSettled([assets.loadAll(), document.fonts?.load('700 20px "Atkinson Hyperlegible"')]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
