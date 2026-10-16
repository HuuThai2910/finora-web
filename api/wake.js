/*
 * Hàm Vercel cho màn đánh thức: đọc trạng thái VM chạy backend FINORA trên Azure và bật VM
 * khi có người vào web. VM tự tắt khi không ai dùng (xem finora-platform/deploy).
 *
 *   GET  /api/wake          → 200 { vm, ready, services, codeRequired }
 *   POST /api/wake { code } → 202 { vm: 'starting' } | 200 { vm } nếu VM không ở trạng thái tắt
 *                             403 { error: 'WRONG_CODE' } | 502 { error: 'AZURE_UNAVAILABLE' }
 *
 * Quyền Azure lấy từ service principal finora-vercel-wake, chỉ có role "FINORA VM Power" trên
 * đúng VM này. WAKE_CODE chặn bot hoặc người lạ bật VM làm tốn credit; bỏ biến này thì ai vào
 * web cũng bật được.
 */
import { timingSafeEqual } from 'node:crypto';

const ARM = 'https://management.azure.com';
const ARM_API_VERSION = '2024-07-01';
const STATUS_TIMEOUT_MS = 3000;
// VM ghi trạng thái mỗi 10 giây; file cũ hơn mức này là của phiên trước, chưa đáng tin.
const STATUS_MAX_AGE_MS = 60_000;

let cachedToken = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}

/** Token client credentials cho Azure Resource Manager; giữ lại giữa các lần gọi khi hàm còn ấm. */
async function armToken() {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: requireEnv('AZURE_CLIENT_ID'),
    client_secret: requireEnv('AZURE_CLIENT_SECRET'),
    scope: `${ARM}/.default`,
  });
  const res = await fetch(`https://login.microsoftonline.com/${requireEnv('AZURE_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw new Error(`Lấy token Azure thất bại: HTTP ${res.status}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

function vmUrl(action) {
  const vmPath = [
    'subscriptions', requireEnv('AZURE_SUBSCRIPTION_ID'),
    'resourceGroups', requireEnv('AZURE_RESOURCE_GROUP'),
    'providers/Microsoft.Compute/virtualMachines', requireEnv('AZURE_VM_NAME'),
  ].join('/');
  return `${ARM}/${vmPath}/${action}?api-version=${ARM_API_VERSION}`;
}

/** Trạng thái nguồn của VM: running, starting, stopping, stopped, deallocating, deallocated. */
async function readPowerState(token) {
  const res = await fetch(vmUrl('instanceView'), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Đọc trạng thái VM thất bại: HTTP ${res.status}`);
  const data = await res.json();
  const power = (data.statuses ?? []).find((s) => typeof s.code === 'string' && s.code.startsWith('PowerState/'));
  return power ? power.code.slice('PowerState/'.length) : 'unknown';
}

/** Trạng thái container do VM ghi ra; null khi chưa đọc được (VM mới bật, Caddy chưa chạy). */
async function readServices() {
  try {
    const res = await fetch(`https://${requireEnv('FINORA_API_DOMAIN')}/_status.json`, {
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const status = await res.json();
    const age = Date.now() - Date.parse(status.updatedAt);
    return age < STATUS_MAX_AGE_MS ? status : null;
  } catch (error) {
    // Lúc VM vừa bật, kết nối bị từ chối hoặc hết giờ là bình thường: báo "đang khởi động".
    console.info('[wake] chưa đọc được trạng thái dịch vụ:', error instanceof Error ? error.message : error);
    return null;
  }
}

function codeMatches(given) {
  const expected = process.env.WAKE_CODE;
  if (!expected) return true;
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const token = await armToken();
      const vm = await readPowerState(token);
      const status = vm === 'running' ? await readServices() : null;
      return res.status(200).json({
        vm,
        ready: status?.ready === true,
        services: status?.services ?? null,
        codeRequired: Boolean(process.env.WAKE_CODE),
      });
    }

    if (req.method === 'POST') {
      // Kiểm mã trước mọi lời gọi Azure để người dò mã không làm tốn lượt gọi.
      if (!codeMatches(req.body?.code)) return res.status(403).json({ error: 'WRONG_CODE' });
      const token = await armToken();
      const vm = await readPowerState(token);
      // Đang chạy, đang bật hoặc đang tắt dở: không gọi start (Azure trả 409 khi đang deallocate).
      if (vm !== 'deallocated' && vm !== 'stopped') return res.status(200).json({ vm });
      const start = await fetch(vmUrl('start'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!start.ok) throw new Error(`Bật VM thất bại: HTTP ${start.status}`);
      return res.status(202).json({ vm: 'starting' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    console.error('[wake]', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'AZURE_UNAVAILABLE' });
  }
}
