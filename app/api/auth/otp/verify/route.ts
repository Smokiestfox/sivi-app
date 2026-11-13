import { handleOtpRoute } from "../../../../../server/auth/otp-route";
import { verifyOtp } from "../../../../../server/auth/otp";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleOtpRoute(request, verifyOtp);
}
