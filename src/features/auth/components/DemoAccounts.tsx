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

export function DemoAccounts({ currentEmail, onPick }: DemoAccountsProps) {
  return (
    <div className="login-demo">
      <p className="login-demo-title">
        Tài khoản dùng thử <span>bấm để điền sẵn</span>
      </p>
      <div className="login-demo-list">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="login-demo-chip"
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
