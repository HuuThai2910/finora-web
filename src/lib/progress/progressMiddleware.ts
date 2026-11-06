import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { isBackgroundRequest } from '@/lib/api/background';
import { finishProgress, startProgress } from './progressStore';

interface RtkQueryMeta {
  requestId?: string;
  requestStatus?: 'pending' | 'fulfilled' | 'rejected';
  arg?: { endpointName?: string; forceRefetch?: boolean; type?: 'query' | 'mutation' };
}

/** Action của RTK Query: `<reducerPath>/executeQuery/<status>` hoặc `<reducerPath>/executeMutation/<status>`. */
const RTK_ACTION = /\/(executeQuery|executeMutation)\/(pending|fulfilled|rejected)$/;

/**
 * Theo dõi mọi query và mutation của mọi API slice cho thanh tải toàn trang: `pending` thêm một việc, `fulfilled`/
 * `rejected` bỏ đi. Lượt chạy nền (polling, chuông thông báo) không tính để thanh không hiện liên tục.
 */
export const progressMiddleware: Middleware = () => (next) => (action) => {
  const typed = action as UnknownAction & { meta?: RtkQueryMeta };
  const match = typeof typed.type === 'string' ? RTK_ACTION.exec(typed.type) : null;
  const requestId = typed.meta?.requestId;
  if (match && requestId) {
    const key = `rtk-${requestId}`;
    if (match[2] === 'pending') {
      const isQuery = match[1] === 'executeQuery';
      if (!(isQuery && isBackgroundRequest(typed.meta?.arg?.endpointName, typed.meta?.arg?.forceRefetch))) {
        startProgress(key);
      }
    } else {
      finishProgress(key);
    }
  }
  return next(action);
};
