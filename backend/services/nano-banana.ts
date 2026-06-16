import zlib from "node:zlib";

// "Nano Banana" is Google's nickname for Gemini's image model. The configured
// NANO_BANANA_API_KEY is a Gemini (Google AI) API key, and image bytes come back
// inline as base64 (no hosted URL), so we return a data URI.
const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type InlineData = { mimeType?: string; mime_type?: string; data?: string };

export async function generateImage(prompt: string): Promise<string> {
  // Stub mode: skip the (paid) Gemini call and return a locally-generated placeholder
  // PNG as a data URI. This exercises the same data-URI path as real output (marketer
  // vision fetch + Printify base64 upload) so the rest of the pipeline can be verified
  // without billing. Set IMAGE_GEN_STUB=1 in .env to enable.
  if (process.env.IMAGE_GEN_STUB === "1" || process.env.IMAGE_GEN_STUB === "true") {
    console.warn("[nano-banana] IMAGE_GEN_STUB on — returning placeholder PNG instead of calling Gemini");
    return placeholderDataUri(prompt);
  }

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

// --- Placeholder PNG generation (stub mode only) -----------------------------
// Builds a real 1024x1024 solid-colour PNG (colour derived from the prompt so each
// design looks distinct) with no external dependencies, returned as a data URI.

const CANVAS = 1024;

function placeholderDataUri(prompt: string): string {
  let h = 2166136261;
  for (let i = 0; i < prompt.length; i++) h = (Math.imul(h ^ prompt.charCodeAt(i), 16777619)) >>> 0;
  const rgb: [number, number, number] = [h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff];
  return `data:image/png;base64,${solidPng(CANVAS, CANVAS, rgb).toString("base64")}`;
}

function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const row = Buffer.alloc(1 + width * 3); // filter byte (0) + RGB pixels
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  // bytes 10-12 (compression/filter/interlace) default to 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
