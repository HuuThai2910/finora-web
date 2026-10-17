import { useState } from 'react';
import { AI_NOTICE_STORAGE_KEY } from '../constants';

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(AI_NOTICE_STORAGE_KEY) === '1';
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư): coi như chưa xem, hiện lại thông báo là an toàn hơn bỏ qua.
    return false;
  }
}

function writeSeen(): void {
  try {
    window.localStorage.setItem(AI_NOTICE_STORAGE_KEY, '1');
  } catch {
    // Không lưu được thì lần mở trình duyệt sau hiện lại thông báo; trong phiên này vẫn dùng bình thường.
  }
}

/**
 * Thông báo lần đầu (spec mục "Ai tham gia và nhìn thấy gì"): đang trò chuyện với AI, dữ liệu đã lược
 * định danh được gửi ra nhà cung cấp ở nước ngoài, không nhập CCCD/mật khẩu/PIN/OTP. Chưa bấm "Đã hiểu"
 * thì ô nhập và nút gợi ý bị khóa, nên không câu hỏi nào rời trình duyệt trước khi người dùng đọc.
 */
export function useAiNoticeConsent() {
  const [accepted, setAccepted] = useState(readSeen);
  const accept = () => {
    writeSeen();
    setAccepted(true);
  };
  return { accepted, accept };
}
