import { handleOtpRoute } from "../../../../../server/auth/otp-route";
import { requestOtp } from "../../../../../server/auth/otp";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleOtpRoute(request, requestOtp);
}
