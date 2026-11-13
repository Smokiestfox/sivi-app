import { authRoute } from "../../../../../server/auth/config";
import { finishGoogleLogin } from "../../../../../server/auth/google";

export async function GET(request: Request) {
  return authRoute(() => finishGoogleLogin(request));
}
