import { handleOtpRoute } from "../../../../../server/auth/otp-route";
import { requestOtp } from "../../../../../server/auth/service";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleOtpRoute(request, requestOtp);
}
