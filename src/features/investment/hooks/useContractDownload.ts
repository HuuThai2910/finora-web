import { useState } from 'react';
import { saveBlob } from '@/utils';
import { fetchContractPdf } from '../api/contractApi';

/**
 * Tải PDF hợp đồng vay về máy cho nút "Tải PDF" ở tab Hợp đồng.
 *
 * Đang tải thì chặn bấm lặp; lỗi giữ lại để hiện cạnh nút. Tên tệp theo mã hiển thị `HĐ-…`, bỏ ký tự không hợp lệ.
 */
export function useContractDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const download = async (contractNumber: string, contractCode: string | null | undefined) => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await fetchContractPdf(contractNumber);
      const base = (contractCode || 'hop-dong').replace(/[\/:*?"<>|\s]+/g, '-');
      saveBlob(blob, `Hop-dong-${base}.pdf`);
    } catch (failure) {
      setError(failure);
    } finally {
      setDownloading(false);
    }
  };

  return { download, downloading, error };
}
