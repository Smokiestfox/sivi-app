import { authRoute } from "../../../../server/auth/config";
import { startGoogleLogin } from "../../../../server/auth/google";

export const dynamic = "force-dynamic";

export async function GET() {
  return authRoute(startGoogleLogin);
}
