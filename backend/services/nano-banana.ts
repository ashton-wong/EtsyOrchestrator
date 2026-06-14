// NOTE: Confirm the exact Nano Banana API endpoint and response shape from their docs before running live.
export async function generateImage(prompt: string): Promise<string> {
  const response = await fetch("https://api.nanobanana.ai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NANO_BANANA_API_KEY}`,
    },
    body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
  });

  if (!response.ok) {
    throw new Error(`Nano Banana API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { image_url: string };
  return data.image_url;
}
