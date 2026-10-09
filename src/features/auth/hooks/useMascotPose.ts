import { useEffect, useRef, useState, type RefObject } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery';

/** Một nhịp chuyển động: chuỗi biến dạng, độ dài, và thời điểm (tỉ lệ 0..1) thay ảnh; null là không thay ảnh. */
interface Beat {
  frames: Keyframe[];
  duration: number;
  swapAt: number | null;
}

/*
 * Các dáng là tranh vẽ riêng (khác nhau từ đỉnh đầu xuống), nên thay ảnh lúc robot còn lộ ra thì kiểu gì mắt
 * cũng thấy một cú cắt. Vì vậy robot thụt hẳn xuống sau thẻ, thay ảnh lúc đang khuất, rồi trồi lên với dáng
 * mới: giống nhân vật ló đầu trong hoạt hình 2D. Nhịp dùng ease-in khi thụt (tăng tốc, thân hơi kéo dài theo
 * hướng lao), ease-out khi trồi (chậm dần), chạm chỗ thì dẹt xuống một chút rồi nảy về dáng thường.
 * Biến dạng lấy gốc ở mép dưới và không đẩy thân cao hơn chỗ đứng, để phần thân bị cắt không lộ khỏi thẻ.
 */
const DIVE = 'cubic-bezier(0.55, 0, 0.85, 0.35)';
const RISE = 'cubic-bezier(0.2, 0.7, 0.4, 1)';

const HOP: Beat = {
  duration: 900,
  swapAt: 0.45,
  frames: [
    { transform: 'none', easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.95)', offset: 0.1, easing: DIVE },
    { transform: 'translateY(100%) scale(0.94, 1.08)', offset: 0.4 },
    { transform: 'translateY(100%)', offset: 0.5, easing: RISE },
    { transform: 'scale(0.96, 1.05)', offset: 0.76, easing: 'ease-in-out' },
    { transform: 'scale(1.04, 0.95)', offset: 0.88, easing: 'ease-out' },
    { transform: 'none' },
  ],
};

/** Như HOP nhưng trồi lên xong thì lắc đầu vài nhịp tắt dần (dùng cho dáng lỗi). */
const SHAKE: Beat = {
  duration: 1400,
  swapAt: 0.27,
  frames: [
    { transform: 'none', easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.95)', offset: 0.06, easing: DIVE },
    { transform: 'translateY(100%) scale(0.94, 1.08)', offset: 0.24 },
    { transform: 'translateY(100%)', offset: 0.3, easing: RISE },
    { transform: 'scale(0.96, 1.05)', offset: 0.46, easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.97) rotate(-3deg)', offset: 0.56, easing: 'ease-in-out' },
    { transform: 'rotate(2.5deg)', offset: 0.68, easing: 'ease-in-out' },
    { transform: 'rotate(-1.5deg)', offset: 0.8, easing: 'ease-in-out' },
    { transform: 'rotate(0.7deg)', offset: 0.9, easing: 'ease-out' },
    { transform: 'none' },
  ],
};

/** Chỉ lắc đầu, không đổi dáng: bù cho lúc đã đổi sang dáng lỗi bằng nhịp HOP (lỗi về ngay khi đang thụt). */
const WOBBLE: Beat = {
  duration: 760,
  swapAt: null,
  frames: [
    { transform: 'none', easing: 'ease-out' },
    { transform: 'rotate(-3deg)', offset: 0.2, easing: 'ease-in-out' },
    { transform: 'rotate(2.5deg)', offset: 0.45, easing: 'ease-in-out' },
    { transform: 'rotate(-1.5deg)', offset: 0.67, easing: 'ease-in-out' },
    { transform: 'rotate(0.7deg)', offset: 0.85, easing: 'ease-out' },
    { transform: 'none' },
  ],
};

/**
 * Dáng đang hiển thị của mascot, chạy sau dáng mong muốn một nhịp thụt-trồi. `rigRef` gắn vào lớp bọc các ảnh.
 *
 * Đổi dáng dồn dập (bấm từ ô email sang ô mật khẩu sinh ra email -> thường -> mật khẩu trong cùng khung hình)
 * không làm nhịp giật lại từ đầu: nhịp đang chạy luôn thay bằng dáng mới nhất lúc robot khuất sau thẻ, và nếu
 * dáng mong muốn đổi tiếp sau lúc thay ảnh thì chạy thêm một nhịp khi nhịp này kết thúc.
 */
export function useMascotPose<P extends string>(target: P, shakeOn: P): { shown: P; rigRef: RefObject<HTMLDivElement> } {
  const rigRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const targetRef = useRef(target);
  const shownRef = useRef(target);
  const animRef = useRef<Animation | null>(null);
  const swapTimer = useRef(0);

  useEffect(() => {
    targetRef.current = target;
    if (animRef.current || target === shownRef.current) return;

    const swap = () => {
      shownRef.current = targetRef.current;
      setShown(targetRef.current);
    };
    const rig = rigRef.current;
    // Giảm chuyển động (hoặc trình duyệt thiếu Web Animations): thay ảnh ngay, không thụt-trồi.
    if (reduced || !rig || typeof rig.animate !== 'function') {
      swap();
      return;
    }

    const play = (beat: Beat) => {
      const anim = rig.animate(beat.frames, { duration: beat.duration });
      animRef.current = anim;
      if (beat.swapAt !== null) swapTimer.current = window.setTimeout(swap, beat.duration * beat.swapAt);
      anim.onfinish = () => {
        animRef.current = null;
        if (targetRef.current !== shownRef.current) play(targetRef.current === shakeOn ? SHAKE : HOP);
        else if (shownRef.current === shakeOn && beat === HOP) play(WOBBLE);
      };
    };
    play(target === shakeOn ? SHAKE : HOP);
  }, [target, shakeOn, reduced]);

  // Rời trang giữa nhịp: dừng hoạt ảnh và hẹn giờ thay ảnh.
  useEffect(
    () => () => {
      animRef.current?.cancel();
      animRef.current = null;
      window.clearTimeout(swapTimer.current);
    },
    [],
  );

  return { shown, rigRef };
}
