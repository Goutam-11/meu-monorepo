# Provider model discovery

Agent creation and editing now use the same intelligence fields: provider, owned
saved credential, searchable model, then temperature. Provider selection filters
the saved credentials. Selecting another provider or credential clears the model
instead of silently substituting a hardcoded default. Existing edited models are
preserved, including IDs not returned by the current catalog.

The AI SDK's generic provider interface constructs models but does not expose a
shared model-list method. AI Gateway has its own `getAvailableModels()` catalog;
Meu uses direct provider credentials rather than that gateway.

## Sources

| Provider | Model-list API |
| --- | --- |
| OpenRouter | `GET https://openrouter.ai/api/v1/models` |
| OpenAI | `GET https://api.openai.com/v1/models` |
| Anthropic | `GET https://api.anthropic.com/v1/models`, native API-key/version headers, cursor pagination |
| NVIDIA NIM | `GET https://integrate.api.nvidia.com/v1/models` |
| OpenCode Zen | `GET https://opencode.ai/zen/v1/models` |
| Amazon Bedrock | Regional control-plane `GET /foundation-models?byOutputModality=TEXT` and paginated `GET /inference-profiles` |

The existing server-side `*_BASE_URL` overrides are respected for compatible
providers. Configure the same endpoint in the frontend and scheduler environment
when using a proxy. Bedrock is pinned to the credential's commercial AWS region.
Redirects are refused to avoid forwarding credentials to a different endpoint.

## Selection and limits

`credentials.models` is authenticated, takes an owned credential ID and a search
query, and returns only model IDs, names, advertised tool support and catalog
warnings. Search matches names and IDs; exact ID matches rank first. The picker
shows up to 40 matches and supports keyboard selection, loading, empty and retry
states. Custom ID entry supports private models and inference-profile IDs/ARNs.

OpenRouter entries require advertised text input/output and `tools`. Known
non-chat products (embeddings, image/audio, rerankers, moderation, guards) are
filtered from compatible catalogs. OpenAI and Anthropic additionally filter to
their chat model families. These are catalog filters, not an invocation test or
proof of tool compatibility. Bedrock includes active text foundation models and
active inference profiles; listing does not prove Converse/tool support or access.
Application inference profiles use their ARN. If one Bedrock list is denied, the
other remains available with a warning. If both fail, custom entry and retry remain
available. No stale hardcoded catalog is presented as a live result.

Each successful server catalog is cached for five minutes, scoped by owner,
credential identity/type/region/key and configured endpoint. Ownership is checked
before cache hits. Key changes invalidate the cache identity. The cache holds up
to 32 catalogs, deduplicates pending requests and permits four concurrent catalog
loads. A load has a 20-second deadline, an 8 MiB limit per response, a ten-page
pagination cap and a 10,000-model cap. Provider failures are sanitized; raw errors,
headers, API keys and provider response bodies are not returned or logged. Keys
remain encrypted at rest where saved through the credentials router.

## References and verification

- [AI Gateway model discovery](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway#dynamic-model-discovery)
- [OpenRouter model list](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [Anthropic model list](https://platform.claude.com/docs/en/api/models/list)
- [Bedrock model discovery](https://docs.aws.amazon.com/bedrock/latest/userguide/models-get-info.html)
- [Bedrock API-key scope](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-reference.html)

`tests/provider-models.test.ts` covers filtering/search, ownership on cache hits,
key rotation, concurrent-load deduplication, Anthropic pagination, Bedrock region
pinning/profile pagination/partial permissions and sanitized failures. Live
metadata reads also verified the saved OpenRouter and Bedrock credentials without
model generation or exchange writes.
