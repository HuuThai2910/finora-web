export { SecondaryMarketPage } from './pages/SecondaryMarketPage';
export { default as OrderBookDetailPage } from './pages/OrderBookDetailPage';
export { default as TradeDetailPage } from './pages/TradeDetailPage';
// Trang Xác minh dữ liệu (blockchain) cần đọc giấy xác nhận chuyển nhượng và tải PDF để tính lại hash.
export { fetchTransferDocumentPdf, useLazyGetTransferDocumentQuery } from './api/orderBookApi';
export { useTransferDocumentDownload } from './hooks/useTransferDocumentDownload';
export type { TransferDocumentDetail, TransferDocumentStatus } from './types';
