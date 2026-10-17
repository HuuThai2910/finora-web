import { configureStore } from '@reduxjs/toolkit';
import { loanApi } from '@/lib/api/loanApi';
import { aiApi } from '@/lib/api/aiApi';
import { investmentApi } from '@/lib/api/investmentApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { userServiceApi } from '@/lib/api/userServiceApi';
import { authReducer } from '@/features/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [loanApi.reducerPath]: loanApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [investmentApi.reducerPath]: investmentApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [userServiceApi.reducerPath]: userServiceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      loanApi.middleware,
      aiApi.middleware,
      investmentApi.middleware,
      paymentApi.middleware,
      userServiceApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

