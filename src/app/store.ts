import { configureStore } from '@reduxjs/toolkit';
import { loanApi } from '@/lib/api/loanApi';
import { aiApi } from '@/lib/api/aiApi';
import { investmentApi } from '@/lib/api/investmentApi';
import { authReducer } from '@/features/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [loanApi.reducerPath]: loanApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [investmentApi.reducerPath]: investmentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loanApi.middleware, aiApi.middleware, investmentApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

