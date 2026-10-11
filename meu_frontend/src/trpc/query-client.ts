import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
  QueryCache,
} from '@tanstack/react-query';
import superjson from 'superjson';
import { reportClientError } from '@/lib/client-error-report';
export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: () => reportClientError('query', 'query_failed'),
    }),
    mutationCache: new MutationCache({
      onError: () => reportClientError('mutation', 'mutation_failed'),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
