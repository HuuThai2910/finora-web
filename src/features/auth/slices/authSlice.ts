import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';
import type { AuthState, CurrentUser, LoginRequest } from '../types';

const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true, // starts true until initial session check finishes
  error: null,
};

export const checkAuthSession = createAsyncThunk<CurrentUser | null>(
  'auth/checkAuthSession',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await authApi.getMe();
      return profile;
    } catch {
      return rejectWithValue(null);
    }
  }
);

export const loginUser = createAsyncThunk<CurrentUser, LoginRequest>(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      await authApi.login(credentials);
      const profile = await authApi.getMe();
      return profile;
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      const msg = apiErr?.message || '';

      return rejectWithValue(msg || 'Đăng nhập không thành công');
    }
  }
);

export const logoutUser = createAsyncThunk<void>(
  'auth/logoutUser',
  async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network failure on logout
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // checkAuthSession
    builder
      .addCase(checkAuthSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthSession.fulfilled, (state, action: PayloadAction<CurrentUser | null>) => {
        state.isLoading = false;
        if (action.payload) {
          state.profile = action.payload;
          state.isAuthenticated = true;
          state.user = {
            userId: String(action.payload.id),
            email: action.payload.email,
            fullName: action.payload.fullName || action.payload.email,
            roles: [action.payload.role],
          };
        } else {
          state.profile = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuthSession.rejected, (state) => {
        state.isLoading = false;
        state.profile = null;
        state.isAuthenticated = false;
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<CurrentUser>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.profile = action.payload;
        state.user = {
          userId: String(action.payload.id),
          email: action.payload.email,
          fullName: action.payload.fullName || action.payload.email,
          roles: [action.payload.role],
        };
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = (action.payload as string) || 'Đăng nhập không thành công';
      });

    // logoutUser
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const { clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;
