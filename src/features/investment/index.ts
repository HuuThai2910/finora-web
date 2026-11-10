export { FundingPage } from './pages/FundingPage';
export { default as FundingDetailPage } from './pages/FundingDetailPage';
// Chợ Notes cũng hiện tên hai bên giao dịch, bấm để mở hồ sơ khách hàng như bảng nhà đầu tư của gọi vốn.
export { InvestorLink } from './components/InvestorLink';
export { fundingDetailPath } from './components/FundingListTable';
export { useGetInvestorNotesQuery } from './api/investmentApi';
export type { AdminInvestorNote } from './api/investmentApi';
export { NOTE_STATUS_LABEL, NOTE_STATUS_TONE } from './constants';
// Chợ chuyển nhượng hiện tình hình trả nợ của khoản vay theo cùng API kỳ trả của Loan.
export { useGetLoanInstallmentsQuery } from './api/contractApi';
export type { LoanInstallments } from './types';
