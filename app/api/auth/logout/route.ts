import { authRoute } from "../../../../server/auth/config";
import { logout } from "../../../../server/auth/service";

export async function POST(request: Request) {
  return authRoute(() => logout(request));
}
