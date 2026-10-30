import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const statusUrl = import.meta.env.VITE_GOOGLE_ADS_STATUS_URL || '/api/v1/google-ads/status';
const connectUrl = import.meta.env.VITE_GOOGLE_ADS_CONNECT_URL || '/api/v1/google-ads/connect';

async function readBody(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}

export const loadGoogleAdsStatus = createAsyncThunk(
  'googleAds/loadStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(statusUrl, { credentials: 'include' });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message || `Status request failed (${response.status}).`);
      return body;
    } catch (error) {
      return rejectWithValue(error.message || 'Could not load Google Ads connection status.');
    }
  },
);

export const startGoogleAdsConnection = createAsyncThunk(
  'googleAds/connect',
  async (_, { rejectWithValue }) => {
    if (!connectUrl) return rejectWithValue('Google Ads connect endpoint is not configured.');
    try {
      const response = await fetch(connectUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.origin + window.location.pathname }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.message || `Connection request failed (${response.status}).`);
      const authorizationUrl = body.authorizationUrl || body.authUrl || body.url;
      if (authorizationUrl) {
        const target = new URL(authorizationUrl, window.location.origin);
        if (target.protocol !== 'https:' && target.hostname !== 'localhost') {
          throw new Error('The server returned an invalid authorization URL.');
        }
        return { redirectTo: target.href };
      }
      if (response.redirected && response.url.startsWith('https://accounts.google.com/')) {
        return { redirectTo: response.url };
      }
      if (body.connected === true) return { connected: true, accounts: body.accounts || [] };
      throw new Error('The connect endpoint must return authorizationUrl or connected: true.');
    } catch (error) {
      return rejectWithValue(error.message || 'Could not start Google Ads connection.');
    }
  },
);

const googleAdsSlice = createSlice({
  name: 'googleAds',
  initialState: { status: 'idle', accounts: [], error: null },
  reducers: {
    clearGoogleAdsError(state) { state.error = null; },
    resetGoogleAdsStatus(state) { state.status = 'idle'; state.error = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(loadGoogleAdsStatus.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(loadGoogleAdsStatus.fulfilled, (state, action) => {
        state.accounts = Array.isArray(action.payload.accounts) ? action.payload.accounts : [];
        state.status = action.payload.connected
          ? (state.accounts.length ? 'connected' : 'empty')
          : 'disconnected';
      })
      .addCase(loadGoogleAdsStatus.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || action.error.message;
      })
      .addCase(startGoogleAdsConnection.pending, (state) => { state.status = 'connecting'; state.error = null; })
      .addCase(startGoogleAdsConnection.fulfilled, (state, action) => {
        if (action.payload.connected) {
          state.status = 'connected';
          state.accounts = action.payload.accounts;
        }
      })
      .addCase(startGoogleAdsConnection.rejected, (state, action) => {
        state.status = 'disconnected';
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearGoogleAdsError, resetGoogleAdsStatus } = googleAdsSlice.actions;
export default googleAdsSlice.reducer;
