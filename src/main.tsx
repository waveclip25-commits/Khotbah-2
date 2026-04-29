import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { GenerationProvider } from './context/GenerationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GenerationProvider>
      <App />
    </GenerationProvider>
  </StrictMode>,
);
