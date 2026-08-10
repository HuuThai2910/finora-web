import { useState } from 'react';
import { toUiApiError } from '@/lib/api/errors';
import { useChangeProductStatusMutation, useGetAdminProductsQuery, useSyncProductMutation } from '../api/productApi';
import { useCreateAndSyncProduct } from '../hooks/useCreateAndSyncProduct';
import type { CreateLoanProductRequest } from '../types';
import { CreateProductModal } from './CreateProductModal';
import { ProductTable } from './ProductTable';
import './ProductListPage.css';

type ProductAction = 'activate' | 'deactivate' | 'archive' | 'core-sync';

export default function ProductListPage() {
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const { data, isLoading, isFetching, error, refetch } = useGetAdminProductsQuery({ page, size: 20 });
  const [syncProduct, syncState] = useSyncProductMutation();
  const [changeStatus, statusState] = useChangeProductStatusMutation();
  const createAndSync = useCreateAndSyncProduct();

  async function handleAction(id: number, action: ProductAction, version: number) {
    setActionError('');
    try {
      if (action === 'core-sync') await syncProduct({ id, version }).unwrap();
      else await changeStatus({ id, version, action }).unwrap();
      setNotice(action === 'core-sync' ? 'Đã gửi yêu cầu đồng bộ.' : 'Đã cập nhật trạng thái Product.');
    } catch (requestError) {
      setActionError(toUiApiError(requestError).message);
    }
  }

  async function handleCreate(request: CreateLoanProductRequest) {
    try {
      const result = await createAndSync.execute(request);
      setShowCreate(false);
      setNotice(result.sync?.commandStatus === 'SUCCEEDED'
        ? 'Đã tạo và đồng bộ Product sang Fineract.'
        : 'Đã tạo Product; Fineract chưa đồng bộ, bạn có thể thử lại.');
    } catch {
      // Hook đã chuẩn hóa lỗi để modal hiển thị; giữ modal mở cho admin sửa hoặc thử lại.
    }
  }

  if (isLoading) return <div className="prod-loading">Đang tải danh sách Product...</div>;

  return (
    <section>
      <header className="prod-page-header">
        <h1>Sản phẩm vay</h1>
        <p>Admin quản lý cấu hình FINORA; hệ thống tự đồng bộ Fineract sau khi tạo.</p>
      </header>
      <div className="prod-top-actions">
        {(error || actionError) && <span className="prod-status prod-status-error">{actionError || toUiApiError(error).message}</span>}
        {notice && <span className="prod-status prod-status-saved">{notice}</span>}
        <button className="prod-btn sm prod-btn-ghost" disabled={isFetching} onClick={() => refetch()}>{isFetching ? 'Đang tải...' : 'Làm mới'}</button>
        <button className="prod-btn sm prod-btn-primary" onClick={() => { createAndSync.clearError(); setShowCreate(true); }}>+ Tạo sản phẩm</button>
      </div>
      <div className="prod-card">
        <div className="prod-card-header"><h3>Danh sách Product</h3><span className="spacer" /><span className="ptag ptag-blue">{data?.totalElements ?? 0} sản phẩm</span></div>
        <div className="prod-card-body no-pad">
          <ProductTable products={data?.data ?? []} busy={syncState.isLoading || statusState.isLoading} onAction={handleAction} />
        </div>
        <div className="prod-pagination">
          <span>Trang {page + 1}</span>
          <div>
            <button className="prod-btn sm prod-btn-ghost" disabled={page === 0 || isFetching} onClick={() => setPage(value => value - 1)}>Trang trước</button>
            <button className="prod-btn sm prod-btn-ghost" disabled={(page + 1) * 20 >= (data?.totalElements ?? 0) || isFetching} onClick={() => setPage(value => value + 1)}>Trang sau</button>
          </div>
        </div>
      </div>
      {showCreate && (
        <CreateProductModal
          saving={createAndSync.isLoading}
          serverError={createAndSync.error?.message}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </section>
  );
}
