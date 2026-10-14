import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { appLog, newRequestId, safeLogCode, safeProcedureName } from '@/lib/logging/app-logger';

const handler = async (req: Request) => {
  const requestId = newRequestId();
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext(requestId),
    onError({ error, path }) {
      // Procedure errors are logged by middleware. This covers failures before
      // a registered procedure runs, such as malformed or unmatched requests.
      if (!path || safeProcedureName(path) === 'trpc.procedure') {
        appLog(error.code === 'INTERNAL_SERVER_ERROR' ? 'error' : 'warn', 'trpc.request.rejected', {
          requestId,
          operation: 'trpc.request',
          code: safeLogCode(error.code),
        });
      }
    },
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('x-request-id', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export { handler as GET, handler as POST };
