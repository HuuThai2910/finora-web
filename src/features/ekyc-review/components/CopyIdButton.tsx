import { toast } from '@/lib/toast';


interface CopyIdButtonProps {
  /** Giá trị chép (mã lượt dạng UUID); cũng đặt ở `title` để rê chuột xem được. */
  value: string;
  label: string;
}

/**
 * Nút chép mã kỹ thuật (mã lượt) thay cho việc in nguyên chuỗi UUID lên đầu trang. Kết quả chép báo ngay trên nút và
 * qua vùng `aria-live`; trình duyệt chặn clipboard (trang không an toàn, chưa cấp quyền) thì báo để chép tay từ `title`.
 */
export function CopyIdButton({ value, label }: CopyIdButtonProps) {


  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast.success('Đã chép vào bộ nhớ tạm.');
    } catch {
      toast.warning('Không chép được, rê chuột lên nút để xem mã rồi chép tay.');
    }
  };

  return (
    <button
      type="button"
      className="ekr-copy-id ui-link inline-flex items-center gap-1 text-[13px] [&_svg]:size-3.25"
      title={value}
      onClick={() => void copy()}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
