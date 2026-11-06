import { Icon, type IconName } from '@/components/Icon';

/**
 * Tài khoản mẫu đã seed sẵn ở môi trường phát triển (máy chủ xác thực + user_profiles).
 * Bấm để điền nhanh vào form, người dùng vẫn có thể tự nhập tài khoản khác.
 *
 * LoginPage chỉ dựng khối này khi chạy dev (`import.meta.env.DEV`); bản build phát hành bỏ nhánh đó
 * nên module này (cùng mật khẩu) không đi vào gói JS.
 */
const DEMO_ACCOUNTS: readonly { email: string; password: string; label: string; icon: IconName }[] = [
  { email: 'admin@finora.vn', password: 'Finora@12345', label: 'Quản trị', icon: 'shieldCheck' },
  { email: 'investor@finora.vn', password: 'Finora@12345', label: 'Nhà đầu tư', icon: 'trend' },
  { email: 'le.thu.thao@gmail.com', password: 'Finora@12345', label: 'Người vay', icon: 'userCheck' },
];

interface DemoAccountsProps {
  /** Email đang có trong form, để đánh dấu tài khoản vừa điền. */
  currentEmail: string;
  onPick: (email: string, password: string) => void;
}

/** Một hàng ba nút viên thuốc theo vai trò; hiện sau cùng trong thẻ đăng nhập (login-rise trễ 0,7 s). */
export function DemoAccounts({ currentEmail, onPick }: DemoAccountsProps) {
  return (
    <div className="login-demo mt-5.5 pt-4 border-t border-t-line animate-[login-rise_0.6s_var(--ease-soft)_0.7s_both]">
      <p className="login-demo-title text-primary text-[12.5px] font-semibold">
        Tài khoản dùng thử <span className="ml-1 text-muted font-normal">bấm để điền sẵn</span>
      </p>
      <div className="login-demo-list grid grid-cols-3 gap-1.5 mt-2.5">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="login-demo-chip flex items-center justify-center gap-1.25 min-w-0 h-7.5 px-2 whitespace-nowrap border border-line rounded-[999px] bg-surface-muted text-secondary text-[12.5px] font-medium transition-[background,border-color,color] duration-200 hover:border-[#c9d8f2] hover:bg-brand-50 hover:text-brand data-active:border-[#c9d8f2] data-active:bg-brand-50 data-active:text-brand [&_svg]:flex-none [&_svg]:size-3.5"
            data-active={currentEmail === acc.email || undefined}
            onClick={() => onPick(acc.email, acc.password)}
            aria-label={`Điền tài khoản ${acc.label} (${acc.email})`}
            title={acc.email}
          >
            <Icon name={acc.icon} />
            <span>{acc.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
