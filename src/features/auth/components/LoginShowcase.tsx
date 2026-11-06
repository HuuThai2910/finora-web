import type { CSSProperties } from 'react';
import { BrandMark } from './BrandMark';
import { IntroVideo } from './IntroVideo';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/** Xuất hiện lần lượt khi mở trang: mỗi khối trễ theo biến --d (đặt bằng `delay`). */
const ENTER = 'ls-enter animate-[ls-rise_0.8s_var(--ease-soft)_var(--d,0ms)_both]';

/**
 * Nửa trái màn đăng nhập (chỉ hiện trên màn rộng): thương hiệu, lời giới thiệu và video giới thiệu
 * FINORA cùng bộ nhân vật với nhân vật ló đầu bên form. Nền và sóng nằm ở LoginBackdrop (trải cả trang),
 * nên nửa này để nền trong suốt. Màn thấp (cao tới 760px) thu khoảng cách và cỡ chữ.
 */
export function LoginShowcase() {
  return (
    <aside
      className="ls flex flex-col min-h-screen pt-9 px-12 motion-reduce:**:animate-none! motion-reduce:**:[transition:none]! motion-reduce:[&_*::before]:animate-none! motion-reduce:[&_*::before]:[transition:none]! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:[transition:none]!"
      aria-label="Giới thiệu FINORA"
    >
      <div className={`ls-brand flex items-center gap-2.5 ${ENTER}`} style={delay(0)}>
        <span className="ls-logo grid place-items-center size-8.5 rounded-[10px] bg-brand text-white [&_svg]:size-4.75"><BrandMark /></span>
        <span className="ls-wordmark text-primary text-[16px] font-extrabold tracking-[0.02em]">
          FINORA<span className="ml-1.5 text-secondary font-medium tracking-normal">Quản trị</span>
        </span>
      </div>

      <div className="ls-copy max-w-130 mt-[clamp(20px,4vh,44px)] [@media(max-height:760px)]:mt-4.5">
        <h2
          className={`ls-headline text-primary text-[clamp(28px,2.6vw,38px)] font-extrabold leading-[1.18] tracking-[-0.01em] [@media(max-height:760px)]:text-[28px] ${ENTER}`}
          style={delay(120)}
        >
          Mọi khoản vay,<br />
          <span className="text-brand">một nơi theo dõi.</span>
        </h2>
        <p
          className={`ls-lead mt-3 text-secondary text-[15px] leading-[1.6] [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:text-[14px] ${ENTER}`}
          style={delay(220)}
        >
          Thẩm định hồ sơ, theo dõi gọi vốn và đối soát thanh toán của FINORA trên cùng một màn hình.
        </p>
      </div>

      {/*
        Vùng video chiếm phần cao còn lại của nửa trái. Đáy chừa chỗ để "mặt sàn" trong video (khoảng 92% chiều
        cao) nằm trên đỉnh sóng nền: video phủ lên sóng thì sóng bị cắt ngang thành một ô.
      */}
      <div className={`ls-video-wrap flex flex-1 min-h-0 pt-5 pb-18 [@media(max-height:760px)]:pb-15 ${ENTER}`} style={delay(320)}>
        {/* Vùng chứa kích thước (cq) để video 16:9 co vừa cả bề ngang lẫn bề cao; canh trái theo dòng chữ phía trên. */}
        <div className="ls-video-fit grid flex-1 items-center justify-items-start @container-size">
          <IntroVideo />
        </div>
      </div>
    </aside>
  );
}
