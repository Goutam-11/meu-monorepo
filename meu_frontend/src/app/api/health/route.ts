export const dynamic = 'force-dynamic';

// HTTP readiness only; authenticated trading/account APIs remain protected.
export function GET() {
  return Response.json({status:'ok'});
}
