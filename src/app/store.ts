import { configureStore } from '@reduxjs/toolkit';
import { loanApi } from '@/lib/api/loanApi';

export const store = configureStore({
  reducer: {
    [loanApi.reducerPath]: loanApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(loanApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

