// "Nano Banana" is Google's nickname for Gemini's image model. The configured
// NANO_BANANA_API_KEY is a Gemini (Google AI) API key, and image bytes come back
// inline as base64 (no hosted URL), so we return a data URI.
const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type InlineData = { mimeType?: string; mime_type?: string; data?: string };

export async function generateImage(prompt: string): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.NANO_BANANA_API_KEY ?? "",
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini image API error: ${response.status} ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: InlineData; inline_data?: InlineData }[] } }[];
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }

  throw new Error("Gemini image API: response contained no image data");
}
