import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Chú thích nhỏ căn phải ở đầu thẻ (số việc, mã khoản vay). */
  aside?: ReactNode;
  /** Nút thao tác của cả thẻ, nằm cạnh chú thích. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Thẻ một nhóm việc sau giải ngân (thu hồi, cơ cấu, đối soát, sự cố): cùng khung với thẻ của trang chi tiết hồ sơ để tab
 * "Sau giải ngân" không lệch kiểu với các tab khác. Lớp `svc-card` giữ làm mốc cho kịch bản kiểm thử giao diện.
 */
export function ServicingCard({ title, aside, action, children }: Props) {
  return (
    <article className="ui-card svc-card min-w-0 pt-3.5 px-4.5 pb-4 max-[600px]:px-3.5 max-[600px]:pb-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold leading-[1.4]">{title}</h2>
        {(aside || action) && (
          <div className="flex items-center gap-3">
            {aside && <span className="text-[12px] text-muted">{aside}</span>}
            {action}
          </div>
        )}
      </div>
      {children}
    </article>
  );
}

/** Dòng "Không có …" gọn khi nhóm việc không còn gì cần xử lý. */
export function NothingOpen({ text }: { text: string }) {
  return <p className="svc-none text-[13px] text-muted">{text}</p>;
}

/** Tiêu đề nhỏ của một bảng con trong thẻ (vd. "Lệnh giải ngân chưa có kết quả"). */
export function ServicingSubhead({ children }: { children: ReactNode }) {
  return <h3 className="svc-subhead mt-3 mb-1.5 text-[13px] font-semibold text-secondary first:mt-0">{children}</h3>;
}
