import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWakeStatus, requestWake, WakeApiError } from '../api/wakeApi';
import {
  POLL_INTERVAL_MS,
  RESTART_REQUEST_GAP_MS,
  START_TIMEOUT_MS,
  SYSTEM_WAKE_ENABLED,
  WAKE_CODE_STORAGE_KEY,
} from '../constants';
import type { VmPowerState, WakePhase } from '../types';

export interface SystemWake {
  phase: WakePhase;
  submitting: boolean;
  codeError: string | null;
  submitCode: (code: string) => void;
  retry: () => void;
}

function readStoredCode(): string | null {
  try {
    return window.localStorage.getItem(WAKE_CODE_STORAGE_KEY);
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư): chỉ là không nhớ được mã, vẫn nhập tay được.
    return null;
  }
}

function storeCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(WAKE_CODE_STORAGE_KEY, code);
    else window.localStorage.removeItem(WAKE_CODE_STORAGE_KEY);
  } catch {
    // Như readStoredCode: không lưu được thì lần sau nhập lại mã.
  }
}

const isOff = (vm: VmPowerState) => vm === 'deallocated' || vm === 'stopped';
const isWrongCode = (error: unknown) => error instanceof WakeApiError && error.code === 'WRONG_CODE';

function describeError(error: unknown): string {
  if (error instanceof WakeApiError && error.code === 'AZURE_UNAVAILABLE') {
    return 'Không liên lạc được với Azure để kiểm tra máy chủ. Thử lại sau ít phút.';
  }
  const code = error instanceof WakeApiError ? ` (mã ${error.code})` : '';
  return `Không kiểm tra được trạng thái hệ thống${code}. Kiểm tra kết nối mạng rồi thử lại.`;
}

/**
 * Điều phối màn đánh thức: hỏi trạng thái VM backend trên Azure, bật VM khi cần và chờ tới khi
 * mọi dịch vụ sẵn sàng thì mới cho vào web.
 *
 * - Chỉ chạy khi VITE_SYSTEM_WAKE=true (bản trên Vercel); ở máy dev trả về `ready` ngay.
 * - Trình duyệt đã nhập đúng mã một lần thì lần sau vào web tự bật VM (mã lưu ở localStorage).
 * - Trong lúc chờ, hỏi lại mỗi POLL_INTERVAL_MS và dừng ở START_TIMEOUT_MS để người dùng thử lại,
 *   không hỏi vô hạn. Nếu VM đang tự tắt dở lúc gửi lệnh bật, gửi lại khi nó tắt xong.
 */
export function useSystemWake(): SystemWake {
  const [phase, setPhase] = useState<WakePhase>(() =>
    SYSTEM_WAKE_ENABLED ? { kind: 'checking' } : { kind: 'ready' },
  );
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const codeRef = useRef<string | null>(readStoredCode());
  const lastStartAtRef = useRef(0);

  const sendStart = useCallback(async (code: string | null, signal?: AbortSignal) => {
    lastStartAtRef.current = Date.now();
    await requestWake(code, signal);
  }, []);

  const forgetCode = useCallback(() => {
    codeRef.current = null;
    storeCode(null);
    setPhase({ kind: 'off', codeRequired: true });
  }, []);

  // Lần kiểm tra đầu quyết định: vào web ngay, tự bật VM, hay hỏi mã bật hệ thống.
  useEffect(() => {
    if (phase.kind !== 'checking') return undefined;
    const controller = new AbortController();
    const check = async () => {
      try {
        const status = await fetchWakeStatus(controller.signal);
        if (status.ready) {
          setPhase({ kind: 'ready' });
          return;
        }
        if (isOff(status.vm)) {
          if (status.codeRequired && !codeRef.current) {
            setPhase({ kind: 'off', codeRequired: true });
            return;
          }
          await sendStart(codeRef.current, controller.signal);
        }
        setPhase({ kind: 'starting', status, since: Date.now() });
      } catch (error) {
        if (controller.signal.aborted) return;
        // Mã đã lưu không còn đúng (WAKE_CODE vừa đổi): xóa đi và hỏi lại.
        if (isWrongCode(error)) forgetCode();
        else setPhase({ kind: 'error', message: describeError(error) });
      }
    };
    void check();
    return () => controller.abort();
  }, [phase.kind, sendStart, forgetCode]);

  // Hỏi lại trạng thái theo chu kỳ trong lúc chờ; mỗi lần setPhase tạo object mới để hẹn lượt sau.
  useEffect(() => {
    if (phase.kind !== 'starting') return undefined;
    const { since } = phase;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const timedOut = () => Date.now() - since > START_TIMEOUT_MS;
      try {
        const status = await fetchWakeStatus(controller.signal);
        if (status.ready) {
          setPhase({ kind: 'ready' });
          return;
        }
        if (timedOut()) {
          setPhase({ kind: 'error', message: 'Hệ thống khởi động lâu hơn bình thường. Thử lại, hoặc kiểm tra VM trên Azure.' });
          return;
        }
        if (isOff(status.vm) && Date.now() - lastStartAtRef.current > RESTART_REQUEST_GAP_MS) {
          await sendStart(codeRef.current, controller.signal);
        }
        setPhase({ kind: 'starting', status, since });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isWrongCode(error)) forgetCode();
        // Lỗi tạm thời (mạng chập chờn, hàm Vercel khởi động lạnh) thì chờ tiếp tới hạn.
        else if (timedOut()) setPhase({ kind: 'error', message: describeError(error) });
        else setPhase((current) => (current.kind === 'starting' ? { ...current } : current));
      }
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [phase, sendStart, forgetCode]);

  const submitCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || submitting) return;
      setSubmitting(true);
      setCodeError(null);
      sendStart(code)
        .then(() => {
          codeRef.current = code;
          storeCode(code);
          setPhase({ kind: 'starting', status: null, since: Date.now() });
        })
        .catch((error: unknown) => {
          setCodeError(isWrongCode(error) ? 'Mã không đúng. Hỏi lại người quản lý hệ thống.' : describeError(error));
        })
        .finally(() => setSubmitting(false));
    },
    [sendStart, submitting],
  );

  const retry = useCallback(() => setPhase({ kind: 'checking' }), []);

  return { phase, submitting, codeError, submitCode, retry };
}
