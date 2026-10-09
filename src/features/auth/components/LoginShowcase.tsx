import type { CSSProperties } from 'react';
import { BrandMark } from './BrandMark';
import { IntroVideo } from './IntroVideo';
import './LoginShowcase.css';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * Nửa trái màn đăng nhập (chỉ hiện trên màn rộng): thương hiệu, lời giới thiệu và video giới thiệu
 * FINORA cùng bộ nhân vật với nhân vật ló đầu bên form. Nền và sóng nằm ở LoginBackdrop (trải cả trang).
 */
export function LoginShowcase() {
  return (
    <aside className="ls" aria-label="Giới thiệu FINORA">
      <div className="ls-brand ls-enter" style={delay(0)}>
        <span className="ls-logo"><BrandMark /></span>
        <span className="ls-wordmark">FINORA<span>Quản trị</span></span>
      </div>

      <div className="ls-copy">
        <h2 className="ls-headline ls-enter" style={delay(120)}>
          Mọi khoản vay,<br />
          <span>một nơi theo dõi.</span>
        </h2>
        <p className="ls-lead ls-enter" style={delay(220)}>
          Thẩm định hồ sơ, theo dõi gọi vốn và đối soát thanh toán của FINORA trên cùng một màn hình.
        </p>
      </div>

      <div className="ls-video-wrap ls-enter" style={delay(320)}>
        <div className="ls-video-fit">
          <IntroVideo />
        </div>
      </div>
    </aside>
  );
}
