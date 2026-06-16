import { describe, it, expect } from "vitest";
import { toImageBlock } from "../index.js";

describe("toImageBlock", () => {
  it("maps a known content-type to its media_type and base64-encodes the bytes", () => {
    const block = toImageBlock("image/png", Buffer.from("hello"));
    expect(block).toEqual({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: Buffer.from("hello").toString("base64"),
      },
    });
  });

  it("strips content-type parameters like charset", () => {
    const block = toImageBlock("image/jpeg; charset=binary", new Uint8Array([1, 2, 3]));
    expect(block.source.media_type).toBe("image/jpeg");
  });

  it("falls back to image/png for unsupported or missing content-types", () => {
    expect(toImageBlock("application/octet-stream", new Uint8Array([0])).source.media_type).toBe("image/png");
    expect(toImageBlock(null, new Uint8Array([0])).source.media_type).toBe("image/png");
  });
});
