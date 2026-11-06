import { useEffect, useState } from 'react';
import idle from '@/assets/login/mascot/idle.png';
import hello from '@/assets/login/mascot/hello.png';
import email from '@/assets/login/mascot/email.png';
import password from '@/assets/login/mascot/password.png';
import busy from '@/assets/login/mascot/busy.png';
import error from '@/assets/login/mascot/error.png';
import { useMascotPose } from '../hooks/useMascotPose';

export type LoginFocus = 'none' | 'email' | 'password';
export type LoginMood = 'idle' | 'busy' | 'error';

interface MascotPeekProps {
  focus: LoginFocus;
  showPassword: boolean;
  mood: LoginMood;
}

/**
 * Ảnh robot FINORA (cùng bộ mascot của app mobile) cho từng trạng thái. Các ảnh đã được chuẩn hoá cùng
 * khung, kính mặt cùng cỡ và cùng chỗ, nên trồi lên với dáng mới (useMascotPose) robot vẫn đứng đúng chỗ cũ.
 */
const POSES = { idle, hello, email, password, busy, error } as const;
type Pose = keyof typeof POSES;
const POSE_NAMES = Object.keys(POSES) as Pose[];

/** Trồi lên sau mép thẻ lúc nào và vẫy chào bao lâu (ms). */
const ENTER_DELAY = 900;
const GREETING_MS = 2200;

/** before: còn nấp sau thẻ; hello: vừa trồi lên, đang vẫy chào; done: về dáng thường. */
type Greeting = 'before' | 'hello' | 'done';

function pickPose({ focus, showPassword, mood }: MascotPeekProps, greeting: Greeting): Pose {
  if (mood === 'busy') return 'busy';
  if (mood === 'error') return 'error';
  if (focus === 'password') return showPassword ? 'idle' : 'password';
  if (focus === 'email') return 'email';
  return greeting === 'done' ? 'idle' : 'hello';
}

/** Lời nói đi theo dáng đang hiển thị (không theo dáng mong muốn) để bóng thoại đổi cùng lúc với robot. */
const SAY: Partial<Record<Pose, string>> = {
  hello: 'Chào bạn!',
  password: 'Mình nhắm mắt rồi, cứ gõ đi!',
  busy: 'Đợi mình kiểm tra chút...',
  error: 'Ơ, chưa đăng nhập được. Thử lại nhé!',
};

/**
 * Mascot robot ló đầu sau mép thẻ đăng nhập: vẫy chào khi mở trang, giơ ngón cái khi gõ email, nhắm mắt
 * khi gõ mật khẩu, cầm kính lúp lúc đang kiểm tra, dang tay khi chưa đăng nhập được (kèm lắc nhẹ).
 * Toàn bộ là trang trí: aria-hidden, lỗi thật vẫn do banner lỗi của form thông báo.
 */
export function MascotPeek(props: MascotPeekProps) {
  const [greeting, setGreeting] = useState<Greeting>('before');

  // Chào một lần lúc vừa trồi lên rồi về dáng thường; dọn timer nếu rời trang sớm.
  useEffect(() => {
    const appear = window.setTimeout(() => setGreeting('hello'), ENTER_DELAY);
    const settle = window.setTimeout(() => setGreeting('done'), ENTER_DELAY + GREETING_MS);
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(settle);
    };
  }, []);

  const { shown, rigRef } = useMascotPose(pickPose(props, greeting), 'error');
  // Lời chào chỉ trong lúc chào; robot còn nấp (before) hoặc đang thụt xuống sau khi chào xong thì im.
  const say = shown === 'hello' && greeting !== 'hello' ? undefined : SAY[shown];

  return (
    <>
      {/*
        Lời mascot đặt bên trái đầu mascot, đuôi bóng thoại (::after) chĩa sang phải; viền và chữ đỏ khi chưa
        đăng nhập được (data-mood của .login-stack).
      */}
      {say && (
        <div
          key={say}
          className="login-peek-say absolute top-3 right-53.5 z-3 py-1.75 px-3 border border-[#e6edf8] rounded-[14px] bg-white text-primary text-[12.5px] font-semibold whitespace-nowrap origin-[100%_50%] animate-[login-say-in_0.4s_cubic-bezier(0.34,1.6,0.64,1)_both] in-data-[mood=error]:border-[#f6d3d8] in-data-[mood=error]:text-danger after:content-[''] after:absolute after:top-[calc(50%-6px)] after:-right-1.75 after:size-3 after:[border-right:inherit] after:[border-bottom:inherit] after:[border-top:0] after:[border-left:0] after:bg-white after:transform-[rotate(-45deg)]"
          aria-hidden="true"
        >
          {say}
        </div>
      )}
      {/* Khung mascot dừng đúng ở mép trên thẻ: phần thân dưới coi như nấp sau thẻ. */}
      <div
        className="login-peek absolute top-0 right-3.5 w-(--peek-w) aspect-240/132 overflow-hidden pointer-events-none"
        data-shown={greeting !== 'before' || undefined}
        aria-hidden="true"
      >
        {/*
          Mọi biến dạng đều lấy gốc ở mép dưới (mép thẻ) và không đẩy thân lên cao hơn chỗ đứng, để phần thân bị
          cắt ở mép ảnh không bao giờ lộ ra phía trên thẻ. Thân trồi lên từ sau thẻ lúc mở trang: vươn dài khi lao
          lên, dẹt xuống khi dừng rồi nảy về dáng thường.
        */}
        <div className="login-peek-body absolute inset-0 origin-[50%_100%] transform-[translateY(100%)] in-data-shown:transform-none in-data-shown:animate-[login-peek-rise_0.9s_both]">
          {/* Các tư thế chồng lên nhau; nhịp thụt-trồi đổi dáng chạy trên lớp này (useMascotPose). */}
          <div ref={rigRef} className="login-peek-rig absolute inset-0 origin-[50%_100%]">
            {/*
              Đứng yên: lắc lư quanh mép thẻ kèm thở nhẹ. Không làm mờ chéo giữa các ảnh: ảnh đổi lúc robot
              đang khuất sau thẻ.
            */}
            {POSE_NAMES.map((name) => (
              <img
                key={name}
                className="absolute inset-0 origin-[50%_100%] size-full opacity-0 animate-[login-peek-idle_3.6s_ease-in-out_infinite] select-none data-active:opacity-100"
                src={POSES[name]}
                alt=""
                draggable={false}
                data-active={name === shown || undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
