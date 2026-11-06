import { InvestorLink } from '@/features/investment';

/** Một dòng: nhãn "Mua"/"Bán" cột cố định bên trái, tên xuống dòng thẳng hàng với chính nó nếu dài. */
const LINE = 'grid grid-cols-[30px_minmax(0,1fr)] items-baseline';
const SIDE = 'text-muted text-[12px]';

interface Props {
  buyerId: string;
  sellerId: string;
  /** Tên hiển thị theo mã người dùng (`useActorNames` của bảng). */
  nameOf: (userId: string) => string;
}

/**
 * Hai bên của một lần chuyển nhượng trong một ô hai dòng (bên mua trên, bên bán dưới), thay cho hai cột riêng để bảng
 * không tràn ngang ở 1440px. Tên bấm được để mở hồ sơ khách hàng khi có quyền.
 */
export function PartiesCell({ buyerId, sellerId, nameOf }: Props) {
  return (
    <td className="sm-parties min-w-50 max-w-60 whitespace-normal">
      <span className={LINE}><span className={SIDE}>Mua</span><InvestorLink userId={buyerId} name={nameOf(buyerId)} /></span>
      <span className={`${LINE} mt-0.5`}><span className={SIDE}>Bán</span><InvestorLink userId={sellerId} name={nameOf(sellerId)} /></span>
    </td>
  );
}
