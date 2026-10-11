# Amazon Bedrock connections

Meu supports two explicit endpoints on each saved Bedrock credential:

| Endpoint | API | Example model ID |
| --- | --- | --- |
| Runtime | Native Converse | `us.amazon.nova-2-lite-v1:0` |
| Mantle | OpenAI-compatible `/v1/chat/completions` | `openai.gpt-oss-20b` |

Both use the saved Bedrock API key and AWS region. Endpoints are fixed AWS
hosts; a saved region cannot select a custom host. Existing credentials with
no endpoint field continue to use Runtime. New credential forms suggest
Mantle. No encryption keys or saved API keys are changed by endpoint selection.

Pause linked agents before switching the endpoint in Credentials. Select a
model from the new endpoint's catalog in the agent editor before resuming.
Mantle IDs are not Runtime foundation-model or cross-region profile IDs.
Model-list caches include the endpoint, and editing a credential invalidates
the picker cache. Mantle discovers models via its regional `/v1/models` API.

Mantle currently supports models served by `/v1/chat/completions`.
Responses-only models or models requiring the `/openai/v1` route need a
separate integration. Catalog visibility is not a successful inference test
or a promise of tool support.

The AI SDK's existing ToolLoopAgent orchestrates client-side tools for either
connection. Trading tools retain the same order guards, account locks, risk
limits, durable execution records and 120-second generation deadline.
Failure records include `llmEndpoint` so Runtime failures can be distinguished
from Mantle failures.

Offline adapter tests verify a complete model/tool/result/model round trip.
The user's us-east-1 diagnostic returned real text from Mantle GPT-OSS 20B
and 120B, while Runtime requests returned `Operation not allowed`. A real
Mantle tool-call test remains separate from that text-only test. Do not treat
endpoint switching as proof that AWS Runtime restrictions are resolved.
