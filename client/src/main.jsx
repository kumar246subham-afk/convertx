import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#181A20',
            color: '#f8fafc',
            border: '1px solid #282B37',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#181A20',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#181A20',
            },
          },
        }}
      />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
