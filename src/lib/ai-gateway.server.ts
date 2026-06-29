// Correct Gemini REST API base URL and default model.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  // Separate system messages from conversation turns.
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  // Build the Gemini generateContent request body.
  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    maxOutputTokens: 1200,
    topP: 0.95,
    topK: 40,
    candidateCount: 1,
  };

  if (opts?.json) {
    generationConfig["responseMimeType"] = "application/json";
  }

  const body: Record<string, unknown> = {
    contents: conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig,
  };

  // Attach system instruction if any system messages exist.
  if (systemMessages.length > 0) {
    body["systemInstruction"] = {
      parts: systemMessages.map((m) => ({ text: m.content })),
    };
  }

  // Use the correct endpoint: :generateContent (not :chat)
  const url = `${BASE_URL}/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => ({} as any));
  // Correct Gemini response path: candidates[0].content.parts[0].text
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!content) {
    throw new Error(`Gemini API returned empty content: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return content;
}