import { api } from "@/library/api";

export type ProviderType = "nvidia_nim" | "groq" | "ollama" | "openrouter" | "gemini";

export interface LLMConfigUpdate {
  primary_provider: ProviderType;
  primary_model: string;
  primary_api_key?: string;
  primary_base_url?: string;
  backup_provider?: ProviderType;
  backup_model?: string;
  backup_api_key?: string;
  backup_base_url?: string;
}

export interface LLMConfigOut {
  id: string;
  user_id: string;
  primary_provider: ProviderType;
  primary_model: string;
  primary_api_key_masked?: string;
  primary_base_url?: string;
  backup_provider?: ProviderType;
  backup_model?: string;
  backup_api_key_masked?: string;
  backup_base_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMTestRequest {
  provider: ProviderType;
  model: string;
  api_key?: string;
  base_url?: string;
}

export interface LLMTestResponse {
  success: boolean;
  provider: string;
  model: string;
  latency_ms: number;
  response?: string;
  error?: string;
}

export const settingsService = {
  getLLMConfig: async (): Promise<LLMConfigOut> => {
    return api.get<LLMConfigOut>("/settings/llm");
  },

  updateLLMConfig: async (data: LLMConfigUpdate): Promise<LLMConfigOut> => {
    return api.put<LLMConfigOut>("/settings/llm", data);
  },

  testLLMConnection: async (data: LLMTestRequest): Promise<LLMTestResponse> => {
    return api.post<LLMTestResponse>("/settings/llm/test", data);
  },
};
