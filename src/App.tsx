import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { checkAuthSession, clearAuth, LoginPage, ProtectedRoute } from '@/features/auth';
import AdminLayout from '@/layouts/AdminLayout';
import { LoanListPage, LoanApprovalPage, LoanEvaluationPage } from '@/features/loan';
import { CreditScoringPage } from '@/features/credit-score';
import { ProductListPage } from '@/features/product';
import { UserListPage } from '@/features/user';
import { CustomerKycPage, CustomerDetailPage } from '@/features/kyc';

export default function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(checkAuthSession());

    const handleUnauthorized = () => {
      dispatch(clearAuth());
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
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
          <Route path="customers/kyc" element={<CustomerKycPage />} />
          <Route path="customers/kyc/:id" element={<CustomerDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/loans" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
