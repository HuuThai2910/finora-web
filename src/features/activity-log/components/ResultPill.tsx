import { StatusPill } from '@/components/StatusPill';
import { isErrorStatus } from '../constants';

/** Kết quả một lượt gọi: chỉ "Thành công" hoặc "Lỗi"; mã trả về nằm trong hộp chi tiết. */
export function ResultPill({ status, small = false }: { status: number; small?: boolean }) {
  return isErrorStatus(status)
    ? <StatusPill tone="danger" dot small={small}>Lỗi</StatusPill>
    : <StatusPill tone="success" dot small={small}>Thành công</StatusPill>;
}
