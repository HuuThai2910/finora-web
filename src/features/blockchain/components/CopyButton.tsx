import { toast } from '@/lib/toast';


interface CopyButtonProps {
  value: string;
  /** Tên thứ được chép, để đọc cho trình đọc màn hình ("Chép hash"). */
  label: string;
}

/**
 * Nút chép nhỏ đặt cạnh hash, mã giao dịch: người kiểm toán cần dán sang công cụ khác, chọn chuỗi 64 ký tự bằng chuột
 * dễ sót. Kết quả báo bằng toast; trình duyệt chặn clipboard thì báo để chọn và chép tay.
 */
export function CopyButton({ value, label }: CopyButtonProps) {


  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast.success('Đã chép vào bộ nhớ tạm.');
    } catch {
      toast.warning('Trình duyệt chặn chép tự động, hãy chọn chuỗi và chép tay.');
    }
  };

  return (
    <button
      type="button"
      className="bc-copy inline-flex flex-none items-center gap-1 rounded-sm px-1 py-0.5 text-[12px] font-medium text-brand hover:bg-surface-muted [&_svg]:size-3.25"
      aria-label={label}
      onClick={() => void copy()}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <span>Chép</span>
    </button>
  );
}

/** Mã dài kèm nút chép: chuỗi xuống dòng tự do, nút nằm cuối dòng đầu. */
export function CopyableCode({ value, label, className }: CopyButtonProps & { className: string }) {
  return (
    <span className="bc-copyable flex items-start justify-between gap-2">
      <span className={className}>{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}
