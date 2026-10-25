import { randomInt, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { route } from '@/lib/route';
import { requireUser } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { sendStudentOtp } from '@/lib/email';
import { HttpError, boundedString, readJson, requireSameOrigin } from '@/lib/http';

const scrypt = promisify(scryptCallback);

async function hashOtp(otp: string, salt = randomBytes(16).toString('hex')) {
  const derived = (await scrypt(otp, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function matchesOtp(otp: string, stored: string) {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(otp, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const user = await requireUser();
  if (user.is_verified) throw new HttpError(409, 'Tài khoản đã được xác thực sinh viên.');
  const body = await readJson(request);
  const email = boundedString(body.email, 'Email trường', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email trường không hợp lệ.');

  const universities = await query<{ id: string; domain: string }>('SELECT id, domain FROM universities');
  const university = universities.rows.find((item) => email.endsWith(item.domain));
  if (!university) throw new HttpError(400, 'Email không thuộc tên miền của trường được hỗ trợ.');

  const alreadyLinked = await query<{ id: string }>(
    'SELECT id FROM users WHERE university_email = $1 AND id <> $2',
    [email, user.id],
  );
  if (alreadyLinked.rows[0]) {
    throw new HttpError(409, 'Email sinh viên này đã liên kết với tài khoản khác.');
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await hashOtp(otp);
  await transaction(async (client) => {
    const account = await client.query<{ is_verified: boolean }>(
      'SELECT is_verified FROM users WHERE id=$1 FOR UPDATE',
      [user.id],
    );
    if (!account.rows[0] || account.rows[0].is_verified) {
      throw new HttpError(409, 'Tài khoản đã được xác thực sinh viên.');
    }
    const prior = await client.query(
      `SELECT email FROM otp_verifications
       WHERE user_id = $1 AND last_sent_at > now() - interval '60 seconds'
       LIMIT 1`,
      [user.id],
    );
    if (prior.rows[0]) throw new HttpError(429, 'Vui lòng chờ 60 giây trước khi gửi lại mã.');
    await client.query(
      `INSERT INTO otp_verifications (email, user_id, university_id, code_hash, attempts, expires_at, last_sent_at, consumed_at)
       VALUES ($1, $2, $3, $4, 0, now() + interval '5 minutes', now(), NULL)
       ON CONFLICT (email) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         university_id = EXCLUDED.university_id,
         code_hash = EXCLUDED.code_hash,
         attempts = 0,
         expires_at = EXCLUDED.expires_at,
         last_sent_at = EXCLUDED.last_sent_at,
         consumed_at = NULL`,
      [email, user.id, university.id, codeHash],
    );
  });
  try {
    await sendStudentOtp(email, otp);
  } catch (error) {
    await query('DELETE FROM otp_verifications WHERE email = $1 AND user_id = $2', [email, user.id]);
    throw error;
  }
  return Response.json({ message: 'Mã xác thực đã được gửi đến email trường.' });
});

export const PUT = route(async (request) => {
  requireSameOrigin(request);
  const user = await requireUser();
  const body = await readJson(request);
  const email = boundedString(body.email, 'Email trường', 254).toLowerCase();
  const otp = boundedString(body.otp, 'Mã OTP', 6);
  if (!/^\d{6}$/.test(otp)) throw new HttpError(400, 'Mã OTP phải gồm 6 chữ số.');

  type VerificationOutcome =
    | { error: 'expired' }
    | { error: 'locked' }
    | { error: 'invalid'; attempts: number }
    | { error: null };
  let outcome: VerificationOutcome;
  try {
    outcome = await transaction<VerificationOutcome>(async (client) => {
      const account = await client.query<{ is_verified: boolean }>(
        'SELECT is_verified FROM users WHERE id=$1 FOR UPDATE',
        [user.id],
      );
      if (!account.rows[0] || account.rows[0].is_verified) {
        return { error: 'expired' };
      }
      const otpRecord = await client.query<{
        code_hash: string;
        attempts: number;
        expires_at: Date;
        consumed_at: Date | null;
        university_id: string;
      }>(
        `SELECT code_hash, attempts, expires_at, consumed_at, university_id
         FROM otp_verifications WHERE email = $1 AND user_id = $2 FOR UPDATE`,
        [email, user.id],
      );
      const record = otpRecord.rows[0];
      if (!record || record.consumed_at || record.attempts >= 5 || record.expires_at.getTime() <= Date.now()) {
        return { error: 'expired' };
      }

      if (!(await matchesOtp(otp, record.code_hash))) {
        const attempts = record.attempts + 1;
        await client.query(
          `UPDATE otp_verifications SET attempts = $1,
           consumed_at = CASE WHEN $1 >= 5 THEN now() ELSE consumed_at END
           WHERE email = $2 AND user_id = $3`,
          [attempts, email, user.id],
        );
        return attempts >= 5
          ? { error: 'locked' }
          : { error: 'invalid', attempts };
      }

      await client.query(
        `UPDATE users SET role = CASE WHEN role = 'admin' THEN role ELSE 'student' END,
         is_verified = true, university_id = $1, university_email = $2
         WHERE id = $3`,
        [record.university_id, email, user.id],
      );
      await client.query('DELETE FROM otp_verifications WHERE email = $1', [email]);
      return { error: null };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new HttpError(409, 'Email sinh viên này đã liên kết với tài khoản khác.');
    }
    throw error;
  }
  if (outcome.error === 'expired') throw new HttpError(400, 'Mã OTP không còn hiệu lực. Hãy gửi mã mới.');
  if (outcome.error === 'locked') throw new HttpError(400, 'Bạn đã nhập sai 5 lần. Mã OTP đã bị vô hiệu hóa.');
  if (outcome.error === 'invalid') {
    throw new HttpError(400, `Mã OTP không chính xác. Bạn còn ${5 - outcome.attempts} lần thử.`);
  }
  return Response.json({ message: 'Xác thực sinh viên thành công.' });
});
