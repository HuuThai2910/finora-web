import { useState } from 'react';
import { saveBlob } from '@/utils';
import { fetchTransferDocumentPdf } from '../api/orderBookApi';

/** Tên tệp tải về: theo số văn bản, bỏ ký tự không hợp lệ trong tên tệp (ví dụ dấu "/" của số văn bản). */
function pdfFileName(documentNumber: string | null | undefined, tradeReference: string): string {
  const base = (documentNumber || tradeReference).replace(/[^\w.-]+/g, '-');
  return `Giay-xac-nhan-chuyen-nhuong-${base}.pdf`;
}

/**
 * Tải PDF giấy xác nhận chuyển nhượng Note về máy (dùng ở bảng giao dịch chợ Notes và trang Xác minh dữ liệu).
 *
 * Mỗi hook giữ trạng thái của một nút: đang tải thì chặn bấm lặp, lỗi giữ nguyên để hiện cạnh nút (có mã lỗi từ
 * backend). Tệp chỉ tồn tại trong bộ nhớ trình duyệt tới lúc lưu xong.
 *
 * @returns `download(tradeReference, documentNumber)`, cờ `downloading` và `error` của lần tải gần nhất.
 */
export function useTransferDocumentDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const download = async (tradeReference: string, documentNumber?: string | null) => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await fetchTransferDocumentPdf(tradeReference);
      saveBlob(blob, pdfFileName(documentNumber, tradeReference));
    } catch (failure) {
      setError(failure);
    } finally {
      setDownloading(false);
    }
  };

  return { download, downloading, error };
}
