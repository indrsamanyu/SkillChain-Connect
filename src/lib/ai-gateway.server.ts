const BASE_URL = "https://gemini.googleapis.com/v1";
const MODEL = process.env.GEMINI_MODEL ?? "google/gemini-2.5-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function toGeminiAuthor(role: ChatMessage["role"]): "system" | "user" | "bot" {
  if (role === "user") return "user";
  if (role === "assistant") return "bot";
  return "system";
}

export async function chatCompletion(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const url = `${BASE_URL}/models/${encodeURIComponent(MODEL)}:chat?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    prompt: {
      messages: messages.map((message) => ({
        author: toGeminiAuthor(message.role),
        content: [{ type: "text", text: message.content }],
      })),
    },
    temperature: 0,
    maxOutputTokens: 1200,
    topP: 0.95,
    topK: 40,
    candidateCount: 1,
  };

  if (opts?.json) {
    body["responseFormat"] = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => ({} as any));
  const content =
    data?.candidates?.[0]?.content?.[0]?.text ??
    data?.message?.content?.[0]?.text ??
    "";

  if (!content) {
    throw new Error(`Gemini API returned empty content: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return content;
}