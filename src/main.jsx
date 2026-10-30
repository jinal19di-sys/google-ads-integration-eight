import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { store } from './store.js';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '264424382711-1kipj8quke304rictcd1ktkq0m3kosn1.apps.googleusercontent.com'}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>,
);
