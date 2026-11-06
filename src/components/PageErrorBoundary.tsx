import { Component, type ReactNode } from 'react';

interface PageErrorBoundaryProps {
  children: ReactNode;
  /** Đổi trang (pathname) thì bỏ trạng thái lỗi để trang mới được vẽ lại. */
  resetKey: string;
}

interface PageErrorBoundaryState {
  error: Error | null;
}

const RELOAD_FLAG = 'finora:page-chunk-reloaded';

/** Tab mở từ trước một lần deploy sẽ không tải được phần mã đã đổi tên của trang; tải lại cả trang là đủ. */
function isChunkLoadError(error: Error): boolean {
  // Chrome/Edge: "Failed to fetch dynamically imported module", Firefox: "error loading dynamically imported module",
  // Safari: "Importing a module script failed".
  return /dynamically imported module|Importing a module script failed/i.test(error.message);
}

function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // Trình duyệt chặn sessionStorage: không tự tải lại để tránh vòng lặp, người dùng tự bấm nút.
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Chặn lỗi khi vẽ một trang quản trị để sidebar, header vẫn còn và người dùng tải lại được, thay vì trắng cả ứng dụng.
 * Lỗi tải phần mã của trang (sau khi deploy bản mới) thì tự tải lại một lần trong phiên.
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) reloadOnce();
  }

  componentDidUpdate(previous: PageErrorBoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="ui-alert" role="alert">
        <div>
          Trang này gặp lỗi khi hiển thị.
          <small>Tải lại trang để thử lại. Nếu vẫn lỗi, báo bộ phận kỹ thuật kèm thời điểm gặp lỗi.</small>
        </div>
        <button type="button" className="ui-btn soft" onClick={() => window.location.reload()}>Tải lại trang</button>
      </div>
    );
  }
}
