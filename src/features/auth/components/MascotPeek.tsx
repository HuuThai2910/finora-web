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
      {say && (
        <div key={say} className="login-peek-say" aria-hidden="true">
          {say}
        </div>
      )}
      <div className="login-peek" data-shown={greeting !== 'before' || undefined} aria-hidden="true">
        <div className="login-peek-body">
          <div ref={rigRef} className="login-peek-rig">
            {POSE_NAMES.map((name) => (
              <img key={name} src={POSES[name]} alt="" draggable={false} data-active={name === shown || undefined} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
