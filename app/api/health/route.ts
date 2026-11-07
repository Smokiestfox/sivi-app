export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "sivi-web",
    timestamp: new Date().toISOString(),
  });
}
