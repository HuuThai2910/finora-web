import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { LoanListPage, LoanApprovalPage, OverduePage, DisbursementPage, LoanEvaluationPage } from '@/features/loan';
import { ProductListPage, ProductConfigPage } from '@/features/product';
import { UserListPage } from '@/features/user';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/loans" replace />} />
          <Route path="loans" element={<LoanListPage />} />
          <Route path="loans/approval" element={<LoanApprovalPage />} />
          <Route path="loans/overdue" element={<OverduePage />} />
          <Route path="disbursement" element={<DisbursementPage />} />
          <Route path="loans/evaluation" element={<LoanEvaluationPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/config" element={<ProductConfigPage />} />
          <Route path="users" element={<UserListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
