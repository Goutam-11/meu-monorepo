import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { LanguageModel } from "ai";

export const LLM_REQUEST_TIMEOUT_MS = 120_000;

/** Native Bedrock Converse plus the existing OpenAI-compatible providers. */

export const LLM_PROVIDER_IDS = [
  "openrouter",
  "nvidia",
  "anthropic",
  "openai",
  "opencode",
  "bedrock",
] as const;

export type LLMProviderId = (typeof LLM_PROVIDER_IDS)[number];

export type CreateModelParams = {
  apiKey: string;
  model: string;
  region?: string;
  bedrockEndpoint?: 'runtime' | 'mantle';
};

export type LLMProvider = {
  id: LLMProviderId;
  label: string;
  defaultBaseURL: string;
  /** Env var that overrides defaultBaseURL (self-hosted gateways, proxies) */
  baseURLConfig?: string;
  createModel(params: CreateModelParams): LanguageModel;
};

function openAICompatibleProvider(
  config: Omit<LLMProvider, "createModel">
): LLMProvider {
  return {
    ...config,
    createModel({ apiKey, model }) {
      const client = createOpenAICompatible({
        name: config.id,
        baseURL: process.env[config.baseURLConfig ?? ""] || config.defaultBaseURL,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return client.chatModel(model);
    },
  };
}

export const llmProviderMap: Record<LLMProviderId, LLMProvider> = {
  bedrock: {
    id: "bedrock",
    label: "Amazon Bedrock",
    defaultBaseURL: "",
    createModel({ apiKey, model, region, bedrockEndpoint = 'runtime' }) {
      if (!apiKey.trim() || !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region ?? ""))
        throw new Error("Bedrock requires a saved API key and AWS region");
      if (bedrockEndpoint === 'mantle') {
        return createOpenAICompatible({
          name: 'bedrock-mantle',
          baseURL: `https://bedrock-mantle.${region}.api.aws/v1`,
          headers: { Authorization: `Bearer ${apiKey}` },
        }).chatModel(model);
      }
      if (bedrockEndpoint !== 'runtime') throw new Error('Unknown Bedrock endpoint');
      return createAmazonBedrock({
        apiKey, region,
        // Pin the commercial-region endpoint; saved values never select a custom URL.
        baseURL: `https://bedrock-runtime.${region}.amazonaws.com`,
      })(model);
    },
  },
  openrouter: openAICompatibleProvider({
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    baseURLConfig: "OPENROUTER_BASE_URL",
  }),
  nvidia: openAICompatibleProvider({
    id: "nvidia",
    label: "NVIDIA NIM",
    defaultBaseURL: "https://integrate.api.nvidia.com/v1",
    baseURLConfig: "NVIDIA_BASE_URL",
  }),
  anthropic: openAICompatibleProvider({
    // Anthropic's official OpenAI-compatibility endpoint
    id: "anthropic",
    label: "Anthropic",
    defaultBaseURL: "https://api.anthropic.com/v1/",
    baseURLConfig: "ANTHROPIC_BASE_URL",
  }),
  openai: openAICompatibleProvider({
    id: "openai",
    label: "OpenAI",
    defaultBaseURL: "https://api.openai.com/v1",
    baseURLConfig: "OPENAI_BASE_URL",
  }),
  opencode: openAICompatibleProvider({
    id: "opencode",
    label: "OpenCode Zen",
    defaultBaseURL: "https://opencode.ai/zen/v1",
    baseURLConfig: "OPENCODE_BASE_URL",
  }),
};

/** Resolve a provider by id, tolerating unknown values (falls back to nvidia). */
export function resolveLLMProvider(id?: string | null): LLMProvider {
  if (id && id in llmProviderMap) {
    return llmProviderMap[id as LLMProviderId];
  }
  return llmProviderMap.nvidia;
}
