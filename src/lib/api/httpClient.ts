export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

let isRefreshing = false;
let refreshSubscribers: ((ok: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (ok: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...defaultHeaders,
      ...init?.headers,
    },
  });

  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshRes.ok) {
          isRefreshing = false;
          onRefreshed(true);
        } else {
          isRefreshing = false;
          onRefreshed(false);
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          throw new Error('Phiên đăng nhập đã hết hạn');
        }
      } catch (err) {
        isRefreshing = false;
        onRefreshed(false);
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw err;
      }
    }

    // Wait for the refreshing process
    const retryOk = await new Promise<boolean>((resolve) => {
      subscribeTokenRefresh((ok) => resolve(ok));
    });

    if (retryOk) {
      // Retry original request
      const retryRes = await fetch(path, {
        credentials: 'include',
        ...init,
        headers: {
          ...defaultHeaders,
          ...init?.headers,
        },
      });

      if (!retryRes.ok) {
        return handleError(retryRes);
      }
      return retryRes.json();
    }
  }

  if (!response.ok) {
    return handleError(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function handleError(res: Response): Promise<never> {
  let errorMsg = `Lỗi hệ thống (${res.status})`;
  let data: unknown;
  try {
    const json = await res.json();
    data = json;
    if (json.message) {
      errorMsg = json.message;
    } else if (json.error) {
      errorMsg = json.error;
    }
  } catch {
    // If not JSON, try text
    try {
      const text = await res.text();
      if (text) errorMsg = text;
    } catch {
      // ignore
    }
  }

  const err: ApiError = {
    status: res.status,
    message: errorMsg,
    data,
  };
  throw err;
}
