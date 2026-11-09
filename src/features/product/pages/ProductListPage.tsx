import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { loanApi } from '@/lib/api/loanApi';
import { useGetAdminProductsQuery } from '../api/productApi';
import { ErrorToast } from '@/components/ErrorToast';
import { SearchBox } from '@/components/SearchBox';
import { CreateProductModal } from '../components/CreateProductModal';
import { ProductDetailDrawer } from '../components/ProductDetailDrawer';
import type { ConfirmAction } from '../components/ProductDrawerActions';
import { ProductOverview } from '../components/ProductOverview';
import { ProductTable } from '../components/ProductTable';
import { PRODUCT_FILTERS, PRODUCT_LIST_PAGE_SIZE, isProductFilter, type ProductFilter } from '../constants';
import { useCreateAndSyncProduct } from '../hooks/useCreateAndSyncProduct';
import { useProductAction } from '../hooks/useProductAction';
import { useProductStatusCounts } from '../hooks/useProductStatusCounts';
import { useUpdateProduct } from '../hooks/useUpdateProduct';
import { productToForm, toCreateRequest, toUpdateRequest, type ProductForm } from '../mappers/productForm';
import type { LoanProduct } from '../types';

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/** Mã sản phẩm đang mở trong ngăn chi tiết (`?product=12`); giá trị lạ coi như không mở. */
function readProductId(raw: string | null): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Hộp tạo/sửa đang mở: tạo trống, tạo bản sao (điền sẵn) hoặc sửa một bản nháp. */
type Editor =
  | { mode: 'create'; initial?: ProductForm }
  | { mode: 'edit'; product: LoanProduct; initial: ProductForm };

export default function ProductListPage() {
  const { canView, canAct } = usePermission();
  const dispatch = useDispatch<AppDispatch>();
  // Tab, trang và sản phẩm đang mở nằm trên URL để chia sẻ đường dẫn hoặc quay lại đúng chỗ đang xem.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('status');
  const filter: ProductFilter = isProductFilter(requested) ? requested : 'ALL';
  const page = readPage(searchParams.get('page'));
  const openId = readProductId(searchParams.get('product'));
  const search = (searchParams.get('q') ?? '').trim();

  const list = useGetAdminProductsQuery({
    status: filter === 'ALL' ? undefined : filter,
    q: search || undefined,
    page,
    size: PRODUCT_LIST_PAGE_SIZE,
  });
  const counts = useProductStatusCounts();
  const rowAction = useProductAction();
  const createAndSync = useCreateAndSyncProduct();
  const update = useUpdateProduct();

  // Bước xác nhận chọn từ menu dòng chỉ là ý định tạm thời nên không lên URL; gắn với đúng sản phẩm đã chọn.
  const [ask, setAsk] = useState<{ id: number; action: ConfirmAction } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setNotice = useCallback((message: string | null) => { if (message) toast.success(message); }, []);

  const products = list.data?.data ?? [];
  const canEditProducts = canAct('loan-product');

  const writeQuery = (next: { filter?: ProductFilter; page?: number; productId?: number | null; q?: string }) => {
    const params: Record<string, string> = {};
    const nextFilter = next.filter ?? filter;
    const nextPage = next.page ?? page;
    const nextProduct = next.productId === undefined ? openId : next.productId;
    const nextSearch = next.q ?? search;
    if (nextFilter !== 'ALL') params.status = nextFilter;
    if (nextSearch) params.q = nextSearch;
    if (nextPage > 0) params.page = String(nextPage + 1);
    if (nextProduct != null) params.product = String(nextProduct);
    setSearchParams(params, { replace: next.q !== undefined && next.q !== search });
  };

  const updateQuery = (nextFilter: ProductFilter, nextPage: number) => {
    rowAction.clearError();
    writeQuery({ filter: nextFilter, page: nextPage });
  };

  const openDrawer = (productId: number, action: ConfirmAction | null = null) => {
    setAsk(action ? { id: productId, action } : null);
    writeQuery({ productId });
  };
  const closeDrawer = () => {
    setAsk(null);
    writeQuery({ productId: null });
  };

  // Làm mới bảng, số đếm trên tab và ngăn chi tiết đang mở trong một lần.
  const refreshAll = () => {
    dispatch(loanApi.util.invalidateTags([{ type: 'LoanProductList', id: 'ADMIN' }, 'LoanProduct']));
  };

  const runSync = async (product: LoanProduct) => {
    const message = await rowAction.run(product, 'core-sync');
    if (message) setNotice(message);
  };

  const openEditor = (next: Editor) => {
    createAndSync.clearError();
    update.clearError();
    setEditor(next);
  };

  const handleSubmit = async (form: ProductForm) => {
    if (!editor) return;
    try {
      if (editor.mode === 'edit') {
        await update.execute(editor.product, toUpdateRequest(form, editor.product.version));
        setEditor(null);
        setNotice('Đã lưu bản nháp. Đồng bộ lại sang hệ thống lõi trước khi kích hoạt.');
        return;
      }
      const result = await createAndSync.execute(toCreateRequest(form));
      setEditor(null);
      setAsk(null);
      // Sản phẩm mới nhất đứng đầu tab "Tất cả" (backend sắp theo ngày tạo giảm dần); mở luôn ngăn chi tiết.
      writeQuery({ filter: 'ALL', page: 0, productId: result.product.id });
      setNotice(result.sync?.commandStatus === 'SUCCEEDED'
        ? 'Đã tạo sản phẩm và đồng bộ sang hệ thống lõi.'
        : 'Đã tạo sản phẩm; hệ thống lõi chưa đồng bộ xong, có thể đồng bộ lại trong ngăn chi tiết.');
    } catch {
      // Hook đã chuẩn hóa lỗi để hộp thoại hiển thị; giữ hộp thoại mở cho quản trị viên sửa hoặc gửi lại.
    }
  };

  const editing = editor?.mode === 'edit';

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Sản phẩm vay</h1>
        </div>
        <div className="prod-head-actions flex gap-2 flex-wrap">
          <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          {canEditProducts && (
            <button type="button" className="ui-btn primary" onClick={() => openEditor({ mode: 'create' })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Tạo sản phẩm
            </button>
          )}
        </div>
      </header>

      {/* Hai thẻ đầu trang đọc API thống kê, cần quyền Xem "Tổng quan & thống kê". */}
      {canView('dashboard') && <ProductOverview onOpenProduct={(id) => openDrawer(id)} />}

      <section
        className="ui-card prod-list pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5"
        aria-label="Danh sách sản phẩm vay"
      >
        <div className="prod-list-bar flex items-center justify-between gap-3 flex-wrap mb-3">
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
          <SearchBox
            className="prod-search w-65 max-[760px]:w-full"
            value={search}
            onSearch={(next) => writeQuery({ q: next, page: 0 })}
            label="Tìm sản phẩm vay"
            placeholder="Tìm theo tên hoặc mã sản phẩm"
          />
        </div>

        {rowAction.error && <ErrorToast error={rowAction.error} />}

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không tìm thấy sản phẩm khớp "${search}".`
              : filter !== 'ALL'
              ? 'Chưa có sản phẩm ở trạng thái này.'
              : canEditProducts ? 'Chưa có sản phẩm vay nào. Bấm "Tạo sản phẩm" để bắt đầu.' : 'Chưa có sản phẩm vay nào.'}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ProductTable
              products={products}
              openId={openId}
              busy={rowAction.isBusy}
              canAct={canEditProducts}
              onOpen={(product) => openDrawer(product.id)}
              onAsk={(product, action) => openDrawer(product.id, action)}
              onSync={(product) => void runSync(product)}
              onEdit={(product) => openEditor({ mode: 'edit', product, initial: productToForm(product) })}
              onCopy={(product) => openEditor({ mode: 'create', initial: productToForm(product, true) })}
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

      {openId != null && (
        <ProductDetailDrawer
          key={`${openId}-${ask?.id === openId ? ask.action : ''}`}
          productId={openId}
          initial={products.find((product) => product.id === openId) ?? null}
          ask={ask?.id === openId ? ask.action : null}
          onClose={closeDrawer}
          onEdit={(product) => openEditor({ mode: 'edit', product, initial: productToForm(product) })}
          onNotice={setNotice}
        />
      )}
      {editor && (
        <CreateProductModal
          // Đổi sản phẩm hoặc chế độ thì dựng lại form với giá trị điền sẵn mới.
          key={editor.mode === 'edit' ? `edit-${editor.product.id}` : `create-${editor.initial?.name ?? ''}`}
          mode={editor.mode}
          initial={editor.initial}
          saving={editing ? update.isLoading : createAndSync.isLoading}
          serverError={editing ? update.error : createAndSync.error}
          onClose={() => setEditor(null)}
          onSubmit={handleSubmit}
        />
      )}
      {/* Qua portal để thông báo nổi trên ngăn chi tiết (ngăn cũng vẽ ở body). */}
    </section>
  );
}
