import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { BrandMark } from '@/features/auth';
import { SERVICE_LABELS } from '../constants';
import type { SystemWake } from '../hooks/useSystemWake';
import type { ServiceState, VmPowerState, WakeStatus } from '../types';
import '@/styles/ui.css';
import './WakeScreen.css';

const VM_MESSAGES: Record<VmPowerState, string> = {
  deallocated: 'Đã gửi lệnh bật máy chủ, chờ Azure cấp máy...',
  stopped: 'Đã gửi lệnh bật máy chủ, chờ Azure cấp máy...',
  starting: 'Đang bật máy chủ trên Azure...',
  running: 'Máy chủ đã bật, đang khởi động các dịch vụ...',
  deallocating: 'Máy chủ vừa tự tắt vì lâu không có ai dùng; sẽ bật lại ngay khi tắt xong.',
  stopping: 'Máy chủ vừa tự tắt vì lâu không có ai dùng; sẽ bật lại ngay khi tắt xong.',
  unknown: 'Đang kiểm tra máy chủ...',
};

const isUp = (state: ServiceState) => state === 'healthy' || state === 'running';

function serviceTone(state: ServiceState): { tone: string; label: string } {
  if (isUp(state)) return { tone: 'success', label: 'Sẵn sàng' };
  if (state === 'starting' || state === 'restarting') return { tone: 'warning', label: 'Đang khởi động' };
  if (state === 'unhealthy') return { tone: 'danger', label: 'Chưa ổn định' };
  if (state === 'missing' || state === 'created') return { tone: '', label: 'Chưa chạy' };
  return { tone: 'danger', label: state === 'exited' ? 'Đã dừng' : state };
}

function formatElapsed(since: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - since) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} phút ${seconds % 60} giây` : `${seconds} giây`;
}

function StartingView({ status, since }: { status: WakeStatus | null; since: number }) {
  const services = status?.services ?? null;
  const names = services ? Object.keys(services) : [];
  const upCount = services ? names.filter((name) => isUp(services[name])).length : 0;
  const percent = names.length ? Math.round((upCount / names.length) * 100) : 0;

  return (
    <>
      <h1 className="wake-title">Đang khởi động hệ thống</h1>
      <p className="wake-text" role="status" aria-live="polite">
        {status ? VM_MESSAGES[status.vm] ?? VM_MESSAGES.unknown : VM_MESSAGES.deallocated}
      </p>

      <div className="wake-progress" aria-hidden="true">
        <span style={{ width: services ? `${percent}%` : undefined }} data-indeterminate={!services || undefined} />
      </div>
      <p className="wake-meta">
        {services ? `${upCount}/${names.length} dịch vụ sẵn sàng` : 'Đang chờ máy chủ báo trạng thái dịch vụ'}
        {' · '}đã chờ {formatElapsed(since)}
      </p>

      {services && (
        <ul className="wake-services" aria-label="Trạng thái từng dịch vụ">
          {names.map((name) => {
            const { tone, label } = serviceTone(services[name]);
            return (
              <li key={name}>
                <span>{SERVICE_LABELS[name] ?? name}</span>
                <span className={`ui-pill sm ${tone}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="wake-note">Thường mất khoảng 5 phút. Cứ để trang này mở, xong sẽ tự vào màn đăng nhập.</p>
    </>
  );
}

function CodeForm({ submitting, codeError, onSubmit }: { submitting: boolean; codeError: string | null; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(code);
  };

  return (
    <>
      <h1 className="wake-title">Hệ thống đang tắt</h1>
      <p className="wake-text">
        Máy chủ FINORA tự tắt khi không có ai dùng để tiết kiệm chi phí. Nhập mã bật hệ thống để khởi động lại,
        thường mất khoảng 5 phút. Trình duyệt này sẽ nhớ mã cho lần sau.
      </p>
      <form className="wake-form" onSubmit={handleSubmit}>
        <label className="wake-label" htmlFor="wake-code">Mã bật hệ thống</label>
        <input
          id="wake-code"
          className="wake-input"
          type="password"
          autoComplete="off"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? 'wake-code-error' : undefined}
          required
        />
        {codeError && (
          <p id="wake-code-error" className="wake-error" role="alert">
            <Icon name="alert" />
            <span>{codeError}</span>
          </p>
        )}
        <button type="submit" className="ui-btn primary wake-submit" disabled={submitting || !code.trim()}>
          {submitting ? 'Đang gửi lệnh bật...' : 'Bật hệ thống'}
          {!submitting && <Icon name="bolt" />}
        </button>
      </form>
    </>
  );
}

/** Màn chờ trước khi vào web: kiểm tra, hỏi mã, theo dõi khởi động hoặc báo lỗi. */
export function WakeScreen({ phase, submitting, codeError, submitCode, retry }: SystemWake) {
  return (
    <div className="wake-screen">
      <main className="wake-card">
        <div className="wake-brand">
          <span className="wake-logo" aria-hidden="true"><BrandMark /></span>
          <span className="wake-wordmark">FINORA</span>
        </div>

        {phase.kind === 'checking' && (
          <div className="wake-checking" role="status" aria-live="polite">
            <span className="wake-spinner" aria-hidden="true" />
            <p className="wake-text">Đang kiểm tra hệ thống...</p>
          </div>
        )}

        {phase.kind === 'off' && <CodeForm submitting={submitting} codeError={codeError} onSubmit={submitCode} />}

        {phase.kind === 'starting' && <StartingView status={phase.status} since={phase.since} />}

        {phase.kind === 'error' && (
          <>
            <h1 className="wake-title">Chưa khởi động được</h1>
            <p className="wake-error" role="alert">
              <Icon name="alert" />
              <span>{phase.message}</span>
            </p>
            <button type="button" className="ui-btn primary wake-submit" onClick={retry}>
              <Icon name="refresh" />
              Thử lại
            </button>
          </>
        )}
      </main>
    </div>
  );
}
