/**
 * Lưu một tệp đã tải về máy người dùng qua object URL. Thu hồi URL sau khi trình duyệt nhận lệnh tải để không giữ
 * tệp (văn bản pháp lý) trong bộ nhớ lâu hơn cần thiết.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Thu hồi trễ một nhịp: một số trình duyệt huỷ lượt tải nếu URL bị thu hồi ngay trong cùng lượt click.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
