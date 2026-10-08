import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { Toast } from '@/components/Toast';
import { loanApi } from '@/lib/api/loanApi';
import { useGetAdminProductsQuery } from '../api/productApi';
import { ActionError } from '../components/ActionError';
import { CreateProductModal } from '../components/CreateProductModal';
import { ProductDetailDrawer } from '../components/ProductDetailDrawer';
import { ProductOverview } from '../components/ProductOverview';
import { ProductTable } from '../components/ProductTable';
import { PRODUCT_FILTERS, PRODUCT_LIST_PAGE_SIZE, isProductFilter, type ProductFilter } from '../constants';
import { useCreateAndSyncProduct } from '../hooks/useCreateAndSyncProduct';
import { useProductAction } from '../hooks/useProductAction';
import { useProductStatusCounts } from '../hooks/useProductStatusCounts';
import type { CreateLoanProductRequest, LoanProduct } from '../types';
import './ProductListPage.css';

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

type OpenDrawer = { id: number; initial: LoanProduct | null; askArchive: boolean } | null;

export default function ProductListPage() {
  const dispatch = useDispatch<AppDispatch>();
  // Tab và trang nằm trên URL để chia sẻ đường dẫn hoặc quay lại đúng chỗ đang xem.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('status');
  const filter: ProductFilter = isProductFilter(requested) ? requested : 'ALL';
  const page = readPage(searchParams.get('page'));

  const list = useGetAdminProductsQuery({
    status: filter === 'ALL' ? undefined : filter,
    page,
    size: PRODUCT_LIST_PAGE_SIZE,
  });
  const counts = useProductStatusCounts();
  const rowAction = useProductAction();
  const createAndSync = useCreateAndSyncProduct();

  const [drawer, setDrawer] = useState<OpenDrawer>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const products = list.data?.data ?? [];

  const updateQuery = (nextFilter: ProductFilter, nextPage: number) => {
    const params: Record<string, string> = {};
    if (nextFilter !== 'ALL') params.status = nextFilter;
    if (nextPage > 0) params.page = String(nextPage + 1);
    rowAction.clearError();
    setSearchParams(params);
  };

  // Làm mới bảng, số đếm trên tab và ngăn chi tiết đang mở trong một lần.
  const refreshAll = () => {
    dispatch(loanApi.util.invalidateTags([{ type: 'LoanProductList', id: 'ADMIN' }, 'LoanProduct']));
  };

  const runRowAction = async (product: LoanProduct, action: 'activate' | 'deactivate' | 'core-sync') => {
    const message = await rowAction.run(product, action);
    if (message) setNotice(message);
  };

  const handleCreate = async (request: CreateLoanProductRequest) => {
    try {
      const result = await createAndSync.execute(request);
      setShowCreate(false);
      // Sản phẩm mới nhất đứng đầu tab "Tất cả" (backend sắp theo ngày tạo giảm dần); mở luôn ngăn chi tiết.
      updateQuery('ALL', 0);
      setDrawer({ id: result.product.id, initial: result.product, askArchive: false });
      setNotice(result.sync?.commandStatus === 'SUCCEEDED'
        ? 'Đã tạo sản phẩm và đồng bộ sang Fineract.'
        : 'Đã tạo sản phẩm; Fineract chưa đồng bộ xong, có thể đồng bộ lại trong ngăn chi tiết.');
    } catch {
      // Hook đã chuẩn hóa lỗi để hộp thoại hiển thị; giữ hộp thoại mở cho quản trị viên sửa hoặc gửi lại.
    }
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Sản phẩm vay</h1>
        </div>
        <div className="prod-head-actions">
          <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            className="ui-btn primary"
            onClick={() => {
              createAndSync.clearError();
              setShowCreate(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Tạo sản phẩm
          </button>
        </div>
      </header>

      <ProductOverview onOpenProduct={(id) => setDrawer({ id, initial: null, askArchive: false })} />

      <section className="ui-card prod-list" aria-label="Danh sách sản phẩm vay">
        <div className="prod-list-bar">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái sản phẩm">
            {PRODUCT_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => updateQuery(item.value, 0)}
              >
                {item.label}
                {counts[item.value] != null && <span className="n">{counts[item.value]}</span>}
              </button>
            ))}
          </div>
        </div>

        {rowAction.error && <div className="prod-list-alert"><ActionError error={rowAction.error} /></div>}

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className="ui-empty">
            {filter === 'ALL' ? 'Chưa có sản phẩm vay nào. Bấm "Tạo sản phẩm" để bắt đầu.' : 'Chưa có sản phẩm ở trạng thái này.'}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ProductTable
              products={products}
              openId={drawer?.id ?? null}
              busy={rowAction.isBusy}
              onOpen={(product) => setDrawer({ id: product.id, initial: product, askArchive: false })}
              onAskArchive={(product) => setDrawer({ id: product.id, initial: product, askArchive: true })}
              onAction={(product, action) => void runRowAction(product, action)}
            />
            <Pager
              page={page}
              size={PRODUCT_LIST_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="sản phẩm"
              disabled={list.isFetching}
              onPage={(next) => updateQuery(filter, next)}
            />
          </div>
        )}
      </section>

      {drawer && (
        <ProductDetailDrawer
          key={`${drawer.id}-${drawer.askArchive}`}
          productId={drawer.id}
          initial={drawer.initial}
          askArchive={drawer.askArchive}
          onClose={() => setDrawer(null)}
          onNotice={setNotice}
        />
      )}
      {showCreate && (
        <CreateProductModal
          saving={createAndSync.isLoading}
          serverError={createAndSync.error}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
      {/* Qua portal để thông báo nổi trên ngăn chi tiết (ngăn cũng vẽ ở body). */}
      {notice && createPortal(<Toast message={notice} onDismiss={dismissNotice} />, document.body)}
    </section>
  );
}
