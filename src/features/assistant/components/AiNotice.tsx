import { useId } from 'react';
import { AI_PROVIDER_NOTICE } from '../constants';

/**
 * Thông báo lần đầu (spec "Ai tham gia và nhìn thấy gì", LAW-DATA-2025): đang trò chuyện với AI, dữ
 * liệu đã lược định danh được gửi ra nhà cung cấp ở nước ngoài, không nhập CCCD/mật khẩu/PIN/OTP.
 * Thông báo thay chỗ ô nhập, nên chưa bấm "Đã hiểu" thì chưa câu hỏi nào rời trình duyệt.
 * Nút có `data-autofocus` để `useDrawerFocus` đặt focus vào đây khi ngăn mở.
 */
export function AiNotice({ onAccept }: { onAccept: () => void }) {
  const headingId = useId();
  return (
    <section className="as-notice" aria-labelledby={headingId}>
      <h3 id={headingId}>Bạn đang trò chuyện với AI</h3>
      <ul>
        <li>Trợ lý chỉ đọc số liệu và chỉ đường; không duyệt, từ chối hay sửa dữ liệu nào.</li>
        <li>
          Câu hỏi và dữ liệu đã lược bỏ định danh (không tên, CCCD, số điện thoại, email; thu nhập chỉ theo
          khoảng) được gửi tới nhà cung cấp AI ở nước ngoài: {AI_PROVIDER_NOTICE}.
        </li>
        <li>Không nhập CCCD, mật khẩu, mã PIN hoặc OTP vào ô chat.</li>
      </ul>
      <button type="button" className="ui-btn primary" data-autofocus onClick={onAccept}>
        Đã hiểu, bắt đầu hỏi
      </button>
    </section>
  );
}
