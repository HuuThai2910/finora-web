import { lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetApiCaches, type AppDispatch } from '@/app/store';
import { checkAuthSession, expireSession, LoginPage, ProtectedRoute } from '@/features/auth';
import { GlobalProgressBar } from '@/components/GlobalProgressBar';
import { Toaster } from '@/components/Toaster';
import AdminLayout from '@/layouts/AdminLayout';
import { PAGE_ACCESS } from '@/layouts/adminNavigation';
import { AdminHomeRedirect, RequirePageAccess } from '@/layouts/RequirePageAccess';

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
const ProductListPage = page(() => import('@/features/product'), 'ProductListPage');
const UserListPage = page(() => import('@/features/user'), 'UserListPage');
const StaffRolesPage = page(() => import('@/features/user'), 'StaffRolesPage');
const CustomerKycPage = page(() => import('@/features/kyc'), 'CustomerKycPage');
const CustomerDetailPage = page(() => import('@/features/kyc'), 'CustomerDetailPage');
const EkycReviewDetailPage = page(() => import('@/features/ekyc-review'), 'EkycReviewDetailPage');
const FundingPage = page(() => import('@/features/investment'), 'FundingPage');
const FundingDetailPage = page(() => import('@/features/investment'), 'FundingDetailPage');
const SecondaryMarketPage = page(() => import('@/features/secondary-market'), 'SecondaryMarketPage');
const OrderBookDetailPage = page(() => import('@/features/secondary-market'), 'OrderBookDetailPage');
const TradeDetailPage = page(() => import('@/features/secondary-market'), 'TradeDetailPage');
const BlockchainProofsPage = page(() => import('@/features/blockchain'), 'BlockchainProofsPage');
const ActivityLogPage = page(() => import('@/features/activity-log'), 'ActivityLogPage');

export default function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(checkAuthSession());

    // Làm mới phiên thất bại: báo hết phiên (màn đăng nhập hiện lời nhắc) và bỏ cache của phiên cũ. ProtectedRoute
    // chuyển về /login kèm trang đang xem (cả bộ lọc trên URL) để đăng nhập lại thì về đúng chỗ.
    const handleUnauthorized = () => {
      dispatch(expireSession());
      resetApiCaches();
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
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Mỗi trang kiểm quyền Xem của chức năng (PAGE_ACCESS); trang chỉ chuyển hướng thì không cần. */}
          <Route index element={<AdminHomeRedirect />} />
          <Route path="dashboard" element={<RequirePageAccess access={PAGE_ACCESS.dashboard}><DashboardPage /></RequirePageAccess>} />
          <Route path="loans" element={<RequirePageAccess access={PAGE_ACCESS.loans}><LoanListPage /></RequirePageAccess>} />
          <Route path="loans/:applicationNumber/review" element={<RequirePageAccess access={PAGE_ACCESS.loans}><LoanReviewPage /></RequirePageAccess>} />
          <Route path="loans/approval" element={<Navigate to="/loans?status=PENDING_REVIEW" replace />} />
          {/* Trang Vận hành khoản vay đã bỏ: việc của từng khoản vay nằm ở tab "Sau giải ngân" của hồ sơ, danh sách lọc sẵn
              ở Quản lý khoản vay. Đường dẫn cũ chuyển hướng để link và bookmark không gãy. */}
          <Route path="loans/overdue" element={<Navigate to="/loans?servicing=OVERDUE" replace />} />
          <Route path="loans/operations" element={<Navigate to="/loans" replace />} />
          <Route path="disbursement" element={<Navigate to="/loans" replace />} />
          <Route path="loans/evaluation" element={<RequirePageAccess access={PAGE_ACCESS.aiPolicy}><AiPolicyPage /></RequirePageAccess>} />
          <Route path="investments/funding" element={<RequirePageAccess access={PAGE_ACCESS.funding}><FundingPage /></RequirePageAccess>} />
          <Route path="investments/funding/:listingId" element={<RequirePageAccess access={PAGE_ACCESS.funding}><FundingDetailPage /></RequirePageAccess>} />
          <Route path="investments/secondary" element={<RequirePageAccess access={PAGE_ACCESS.secondary}><SecondaryMarketPage /></RequirePageAccess>} />
          <Route path="investments/secondary/:listingId" element={<RequirePageAccess access={PAGE_ACCESS.secondary}><OrderBookDetailPage /></RequirePageAccess>} />
          <Route path="investments/secondary/:listingId/trades/:tradeReference" element={<RequirePageAccess access={PAGE_ACCESS.secondary}><TradeDetailPage /></RequirePageAccess>} />
          <Route path="products" element={<RequirePageAccess access={PAGE_ACCESS.products}><ProductListPage /></RequirePageAccess>} />
          <Route path="products/config" element={<Navigate to="/products" replace />} />
          <Route path="users" element={<RequirePageAccess access={PAGE_ACCESS.users}><UserListPage /></RequirePageAccess>} />
          <Route path="users/roles" element={<RequirePageAccess access={PAGE_ACCESS.staffRoles}><StaffRolesPage /></RequirePageAccess>} />
          <Route path="customers/kyc" element={<RequirePageAccess access={PAGE_ACCESS.customers}><CustomerKycPage /></RequirePageAccess>} />
          <Route path="customers/kyc/:id" element={<RequirePageAccess access={PAGE_ACCESS.customers}><CustomerDetailPage /></RequirePageAccess>} />
          <Route path="customers/kyc/review/:attemptId" element={<RequirePageAccess access={PAGE_ACCESS.ekycReview}><EkycReviewDetailPage /></RequirePageAccess>} />
          {/* Đường dẫn cũ của trang duyệt riêng; nay duyệt từ menu dòng của trang Khách hàng. */}
          <Route path="customers/ekyc-review" element={<Navigate to="/customers/kyc?ekyc=MANUAL_REVIEW" replace />} />
          {/* Trang "Sự cố hệ thống" đã bỏ: khoản vay có sự cố xem ở Quản lý khoản vay (lọc "Có sự cố"). */}
          <Route path="reconciliation" element={<Navigate to="/loans?servicing=INCIDENT" replace />} />
          <Route path="system/incidents" element={<Navigate to="/loans?servicing=INCIDENT" replace />} />
          <Route path="blockchain" element={<Navigate to="/blockchain/proofs" replace />} />
          <Route path="blockchain/proofs" element={<RequirePageAccess access={PAGE_ACCESS.blockchain}><BlockchainProofsPage /></RequirePageAccess>} />
          <Route path="system/activity-logs" element={<RequirePageAccess access={PAGE_ACCESS.activityLogs}><ActivityLogPage /></RequirePageAccess>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <GlobalProgressBar />
    </BrowserRouter>
  );
}
