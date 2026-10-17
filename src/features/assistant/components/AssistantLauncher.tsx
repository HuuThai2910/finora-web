import { Icon } from '@/components/Icon';
import { useAssistantPanel } from '../hooks/useAssistantPanel';
import './AssistantLauncher.css';

/**
 * Nút mở trợ lý ở slot `.header-actions` của `AdminLayout`. Ẩn khi trợ lý tắt hoặc tài khoản không
 * được dùng (`GET /suggestions` không trả 200), nên khi finora-ai chưa bật trợ lý header y như cũ.
 */
export function AssistantLauncher() {
  const { available, isOpen, openAssistant } = useAssistantPanel();
  if (!available) return null;
  return (
    <button
      type="button"
      className="as-launcher"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={() => openAssistant()}
    >
      <Icon name="chat" />
      <span className="as-launcher-label">Trợ lý</span>
    </button>
  );
}
