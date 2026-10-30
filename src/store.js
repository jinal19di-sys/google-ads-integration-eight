import { configureStore } from '@reduxjs/toolkit';
import authReducer from './state/authSlice.js';
import adsReducer from './state/googleAdsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    googleAds: adsReducer,
  },
});
