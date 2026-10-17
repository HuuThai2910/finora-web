import { Icon } from '@/components/Icon';
import { safeInternalPath } from '../mappers/display';
import type { AssistantAction } from '../types';

interface ActionLinksProps {
  actions: AssistantAction[];
  onOpenPath: (path: string) => void;
}

/**
 * Nút mở trang quản trị liên quan (bảng `deeplinks.py`, spec mục 13.3). Web chỉ dùng `target.path`;
 * hành động thiếu `path` (dành cho mobile) hoặc đường dẫn không phải nội bộ thì bỏ qua. Nút chỉ điều
 * hướng, không gọi API: mọi thao tác duyệt/từ chối vẫn làm trên trang đích.
 */
export function ActionLinks({ actions, onOpenPath }: ActionLinksProps) {
  const links = actions.flatMap((action) => {
    const path = safeInternalPath(action.target.path);
    return path ? [{ key: `${action.key}-${path}`, label: action.label, path }] : [];
  });
  if (links.length === 0) return null;

  return (
    <div className="as-actions">
      {links.map((link) => (
        <button key={link.key} type="button" className="ui-btn ghost" onClick={() => onOpenPath(link.path)}>
          {link.label}
          <Icon name="arrowRight" />
        </button>
      ))}
    </div>
  );
}
