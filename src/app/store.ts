import { configureStore } from '@reduxjs/toolkit';
import { loanApi } from '@/lib/api/loanApi';
import { aiApi } from '@/lib/api/aiApi';
import { blockchainApi } from '@/lib/api/blockchainApi';
import { investmentApi } from '@/lib/api/investmentApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { userServiceApi } from '@/lib/api/userServiceApi';
import { authReducer } from '@/features/auth';
import { progressMiddleware } from '@/lib/progress/progressMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [loanApi.reducerPath]: loanApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [blockchainApi.reducerPath]: blockchainApi.reducer,
    [investmentApi.reducerPath]: investmentApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [userServiceApi.reducerPath]: userServiceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      loanApi.middleware,
      aiApi.middleware,
      blockchainApi.middleware,
      investmentApi.middleware,
      paymentApi.middleware,
      userServiceApi.middleware,
      progressMiddleware,
    ),
});

/**
 * Xóa cache của mọi API slice RTK Query. Gọi khi đăng xuất và khi hết phiên: người đăng nhập tiếp theo trên cùng tab
 * (có thể là tài khoản khác, ít quyền hơn) không được thấy dữ liệu của phiên trước trong lúc chờ tải lại.
 */
export function resetApiCaches() {
  [loanApi, aiApi, blockchainApi, investmentApi, paymentApi, userServiceApi].forEach((api) => {
    store.dispatch(api.util.resetApiState());
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

