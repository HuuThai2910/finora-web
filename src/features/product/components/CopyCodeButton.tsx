interface CopyCodeButtonProps {
  code: string;
  onNotice: (message: string) => void;
}

/** Nút chép mã sản phẩm. Trình duyệt chặn clipboard (trang không an toàn, chưa cấp quyền) thì báo để chép tay. */
export function CopyCodeButton({ code, onNotice }: CopyCodeButtonProps) {
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(code);
      onNotice('Đã chép mã sản phẩm.');
    } catch {
      onNotice('Trình duyệt không cho chép tự động, hãy chọn mã và chép thủ công.');
    }
  };

  return (
    <button type="button" className="prod-copy" aria-label="Chép mã sản phẩm" title="Chép mã" onClick={() => void copy()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}
