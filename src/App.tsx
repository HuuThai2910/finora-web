import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { LoanListPage, LoanApprovalPage, LoanEvaluationPage, CreditScoringPage } from '@/features/loan';
import { ProductListPage } from '@/features/product';
import { UserListPage } from '@/features/user';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/loans" replace />} />
          <Route path="loans" element={<LoanListPage />} />
          <Route path="loans/:applicationNumber/review" element={<LoanApprovalPage />} />
          <Route path="loans/approval" element={<Navigate to="/loans?status=PENDING_REVIEW" replace />} />
          <Route path="loans/overdue" element={<Navigate to="/loans" replace />} />
          <Route path="disbursement" element={<Navigate to="/loans" replace />} />
          <Route path="loans/evaluation" element={<LoanEvaluationPage />} />
          <Route path="loans/scoring" element={<CreditScoringPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/config" element={<Navigate to="/products" replace />} />
          <Route path="users" element={<UserListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
