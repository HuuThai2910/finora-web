export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

/*
 * Làm mới phiên dùng chung cho mọi client (apiFetch và các slice RTK Query qua `withReauth`).
 * Access token cookie chỉ sống 5 phút, nên khi nhiều request cùng gặp 401 chỉ được gọi
 * /auth/refresh một lần: các request còn lại chờ chung một promise rồi gửi lại.
 */
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshAt = 0;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .then((ok) => {
        if (ok) {
          lastRefreshAt = Date.now();
        } else {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return ok;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Gọi khi một request gửi lúc `startedAt` bị 401. Nếu phiên đã được làm mới sau thời điểm đó
 * (request mang cookie cũ, về muộn hơn lần refresh) thì chỉ cần gửi lại, không refresh thêm.
 * Trả về `true` khi nên gửi lại request.
 */
export function renewSession(startedAt: number): Promise<boolean> {
  if (startedAt < lastRefreshAt) {
    return Promise.resolve(true);
  }
  return refreshSession();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const send = () =>
    fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

  const startedAt = Date.now();
  let response = await send();

  // Các endpoint /auth/* tự xử lý phiên (đăng nhập, làm mới, đăng xuất) nên không thử lại.
  if (response.status === 401 && !path.includes('/auth/') && (await renewSession(startedAt))) {
    response = await send();
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
