import { lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { checkAuthSession, clearAuth, LoginPage, ProtectedRoute } from '@/features/auth';
import AdminLayout from '@/layouts/AdminLayout';

/*
 * Mỗi trang tải theo nhu cầu (code splitting): ECharts và CSS của từng feature chỉ tải khi mở trang
 * cần đến, nên lần mở đầu tiên nhẹ hơn. Suspense nằm trong AdminLayout để khung trang không nháy.
 */
const page = <K extends string, T extends Record<K, ComponentType>>(load: () => Promise<T>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const DashboardPage = page(() => import('@/features/dashboard'), 'DashboardPage');
const LoanListPage = page(() => import('@/features/loan'), 'LoanListPage');
const LoanReviewPage = page(() => import('@/features/loan'), 'LoanReviewPage');
const AiPolicyPage = page(() => import('@/features/rule-engine'), 'AiPolicyPage');
const CreditScoringPage = page(() => import('@/features/credit-score'), 'CreditScoringPage');
const ProductListPage = page(() => import('@/features/product'), 'ProductListPage');
const UserListPage = page(() => import('@/features/user'), 'UserListPage');
const CustomerKycPage = page(() => import('@/features/kyc'), 'CustomerKycPage');
const CustomerDetailPage = page(() => import('@/features/kyc'), 'CustomerDetailPage');
const FundingPage = page(() => import('@/features/investment'), 'FundingPage');
const FundingDetailPage = page(() => import('@/features/investment'), 'FundingDetailPage');
const SecondaryMarketPage = page(() => import('@/features/secondary-market'), 'SecondaryMarketPage');
const ServicingOperationsPage = page(() => import('@/features/servicing'), 'ServicingOperationsPage');

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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="loans" element={<LoanListPage />} />
          <Route path="loans/:applicationNumber/review" element={<LoanReviewPage />} />
          <Route path="loans/approval" element={<Navigate to="/loans?status=PENDING_REVIEW" replace />} />
          <Route path="loans/overdue" element={<ServicingOperationsPage />} />
          <Route path="loans/operations" element={<ServicingOperationsPage />} />
          <Route path="disbursement" element={<Navigate to="/loans" replace />} />
          <Route path="loans/evaluation" element={<AiPolicyPage />} />
          <Route path="loans/scoring" element={<CreditScoringPage />} />
          <Route path="investments/funding" element={<FundingPage />} />
          <Route path="investments/funding/:listingId" element={<FundingDetailPage />} />
          <Route path="investments/secondary" element={<SecondaryMarketPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/config" element={<Navigate to="/products" replace />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="customers/kyc" element={<CustomerKycPage />} />
          <Route path="customers/kyc/:id" element={<CustomerDetailPage />} />
          <Route path="reconciliation" element={<ServicingOperationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
