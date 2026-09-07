import { configureStore } from '@reduxjs/toolkit';
import { loanApi } from '@/lib/api/loanApi';
import { aiApi } from '@/lib/api/aiApi';
import { authReducer } from '@/features/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [loanApi.reducerPath]: loanApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loanApi.middleware, aiApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

