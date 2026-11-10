import { toast } from '@/lib/toast';

interface Props {
  value: string;
  /** Tên thứ được chép, cho trình đọc màn hình và lời báo ("mã hồ sơ"). */
  what: string;
}

/**
 * Nút chép chỉ có biểu tượng, đặt ngay sau một mã (mã hồ sơ, mã đối soát, mã băm). Kết quả báo bằng toast; trình duyệt
 * chặn clipboard thì nhắc chọn và chép tay.
 */
export function CopyIconButton({ value, what }: Props) {
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast.success(`Đã chép ${what}.`);
    } catch {
      toast.warning(`Trình duyệt chặn chép tự động. Hãy chọn ${what} rồi chép thủ công.`);
    }
  };

  return (
    <button
      type="button"
      className="inline-grid size-6 flex-none place-items-center rounded-sm align-middle text-muted hover:bg-surface-muted hover:text-primary [&_svg]:size-3.25"
      onClick={() => void copy()}
      aria-label={`Chép ${what}`}
      title={`Chép ${what}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
    </button>
  );
}
