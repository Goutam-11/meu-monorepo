# Saved AI providers and connection names

Exchange connections and credentials accept an optional `displayName` (up to 80 characters). Cards, searches, dashboard selectors, agent create/edit controls, details and backtest launch controls show the label alongside the unchanged broker/provider type. Older records fall back to the type. Label changes do not select a different adapter or replace a key; blank secret fields on edit keep the existing encrypted values.

## Amazon Bedrock

Meu supports saved Bedrock bearer API key + region credentials with two explicit inference endpoints:

- **Runtime / Converse** uses `@ai-sdk/amazon-bedrock` and requires a model/profile accessible through Converse, including tool support for the agent loop.
- **Mantle** uses the AI SDK OpenAI-compatible chat adapter against the fixed regional AWS Mantle endpoint for supported models.

Choose the endpoint matching your permissions and model. The agent form loads/searches the provider catalog after credential selection. A visible model is not proof of inference access; permissions, regional routing and tool support can still refuse a request. Ambient AWS credentials are not substituted for missing saved values.

Secrets are encrypted in Mongo and redacted from API responses. A blank key preserves the existing secret for same-provider edits; changing provider requires a replacement key. Execution-affecting credential edits require running consumers paused and no retained consumer locks. Renaming does not change inference settings.

See [Bedrock troubleshooting](BEDROCK.md), [model discovery](MODEL_DISCOVERY.md) and [LLM memory](LLM_MEMORY.md) for implementation details and validation boundaries.
