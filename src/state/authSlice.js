import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const params = new URLSearchParams(window.location.search);
const authError = params.get('error_description') || params.get('error');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

async function readApiJson(response, operation) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`The API returned HTML for ${operation}. Restart the Node server on port 4000 and the Vite app.`);
  }
  return response.json();
}

export const loadCurrentUser = createAsyncThunk('auth/loadCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
    if (response.status === 401) {
      sessionStorage.removeItem('adnexa_signed_in');
      return rejectWithValue(null);
    }
    const body = await readApiJson(response, 'checking sign-in');
    if (!response.ok) throw new Error(body.message || `Sign-in status request failed (${response.status}).`);
    return body.user;
  } catch (error) {
    return rejectWithValue(error.message || 'Could not check sign-in status.');
  }
});

export const loadGoogleLoginNonce = createAsyncThunk(
  'auth/loadGoogleLoginNonce',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/google/nonce`, { credentials: 'include' });
      const body = await readApiJson(response, 'preparing Google sign-in');
      if (!response.ok) throw new Error(body.message || `Could not prepare Google sign-in (${response.status}).`);
      return body.nonce;
    } catch (error) {
      return rejectWithValue(error.message || 'Could not prepare Google sign-in.');
    }
  },
  {
    condition: (_, { getState }) => getState().auth.nonceStatus !== 'loading' && !getState().auth.nonce,
  },
);

export const loginWithGoogle = createAsyncThunk('auth/loginWithGoogle', async ({ credential, nonce }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/google/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, nonce }),
    });
    const body = await readApiJson(response, 'Google sign-in');
    if (!response.ok) throw new Error(body.message || `Google sign-in failed (${response.status}).`);
    sessionStorage.setItem('adnexa_signed_in', 'true');
    return body.user;
  } catch (error) {
    return rejectWithValue(error.message || 'Could not sign in with Google.');
  }
});

const initialState = {
  status: 'checking',
  user: null,
  nonce: null,
  nonceStatus: 'idle',
  error: authError || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStarted(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginFailed(state, action) {
      state.status = 'failed';
      state.error = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadGoogleLoginNonce.fulfilled, (state, action) => {
        state.nonce = action.payload;
        state.nonceStatus = 'ready';
      })
      .addCase(loadGoogleLoginNonce.pending, (state) => {
        state.nonceStatus = 'loading';
      })
      .addCase(loadGoogleLoginNonce.rejected, (state, action) => {
        state.nonce = null;
        state.nonceStatus = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(loginWithGoogle.pending, (state) => {
        state.status = 'loading';
        state.nonce = null;
        state.nonceStatus = 'idle';
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.status = 'signedIn';
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.status = 'signedIn';
        state.user = action.payload;
      })
      .addCase(loadCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.status = 'idle';
        if (action.payload) state.error = action.payload;
      });
  },
});

export const { loginStarted, loginFailed, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
