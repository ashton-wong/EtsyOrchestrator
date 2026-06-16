import { describe, it, expect } from "vitest";
import { extractJson } from "../extractJson.js";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });

  it("extracts JSON after a conversational prefix", () => {
    expect(extractJson('Perfect! Here is the result: {"niche":"cats"}')).toEqual({ niche: "cats" });
  });

  it("extracts JSON from a ```json fenced block", () => {
    const text = 'Based on my research:\n```json\n{"score": 80}\n```\nHope that helps!';
    expect(extractJson(text)).toEqual({ score: 80 });
  });

  it("extracts JSON from an unlabelled fenced block", () => {
    expect(extractJson("```\n{\"ok\": true}\n```")).toEqual({ ok: true });
  });

  it("ignores trailing prose after the object", () => {
    expect(extractJson('{"a":1} — let me know if you want changes')).toEqual({ a: 1 });
  });

  it("is not fooled by braces inside string values", () => {
    expect(extractJson('Here: {"text":"use {curly} braces"}')).toEqual({ text: "use {curly} braces" });
  });

  it("throws a clear error when there is no JSON object", () => {
    expect(() => extractJson("I could not complete this task.")).toThrow(/could not extract json/i);
  });
});
