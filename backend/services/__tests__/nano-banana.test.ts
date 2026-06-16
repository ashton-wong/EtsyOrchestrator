import { describe, it, expect, afterEach } from "vitest";
import { generateImage } from "../nano-banana.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("generateImage — IMAGE_GEN_STUB mode", () => {
  afterEach(() => { delete process.env.IMAGE_GEN_STUB; });

  it("returns a valid PNG data URI without any network call when stubbed", async () => {
    process.env.IMAGE_GEN_STUB = "1";
    const uri = await generateImage("vintage avocado tee");
    expect(uri).toMatch(/^data:image\/png;base64,/);
    const bytes = Buffer.from(uri.split(",")[1], "base64");
    expect([...bytes.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it("varies the image by prompt (distinct designs)", async () => {
    process.env.IMAGE_GEN_STUB = "1";
    const a = await generateImage("prompt A");
    const b = await generateImage("prompt B");
    expect(a).not.toBe(b);
  });
});
