/*
 * Số việc đang tải của cả trang (request API không chạy nền và chunk trang đang tải). Kho nằm ngoài React để middleware
 * Redux và Suspense fallback cùng ghi được; `GlobalProgressBar` đọc bằng `useSyncExternalStore`.
 */
const active = new Set<string>();
const listeners = new Set<() => void>();
let snapshot = 0;
let nextToken = 1;

function emit() {
  snapshot = active.size;
  listeners.forEach((listener) => listener());
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveCount(): number {
  return snapshot;
}

export function startProgress(key: string = `task-${nextToken++}`): string {
  if (!active.has(key)) {
    active.add(key);
    emit();
  }
  return key;
}

export function finishProgress(key: string) {
  if (active.delete(key)) emit();
}
