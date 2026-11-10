import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost:5173/.test(location.host)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW:', e)); });
}
