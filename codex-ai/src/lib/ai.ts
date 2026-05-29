export const aiChat = async (prompt: string, systemInstruction?: string, mode: "flash" | "pro" = "flash") => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemInstruction, mode }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text as string;
};

export interface AIProviderInfo {
  name: string;
  baseUrl: string;
  model: string;
  hasKey: boolean;
}

export interface ProvidersResponse {
  providers: Record<string, { name: string; baseUrl: string; model: string }>;
  active: AIProviderInfo;
}

export const getProviders = async (): Promise<ProvidersResponse> => {
  const res = await fetch("/api/ai/providers");
  return res.json();
};

export const configureProvider = async (config: {
  providerKey?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}): Promise<{ success: boolean; active: AIProviderInfo }> => {
  const res = await fetch("/api/ai/configure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
};

export const textToSpeech = async (text: string): Promise<void> => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};
