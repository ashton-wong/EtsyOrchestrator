// LLMs (especially Haiku) often wrap their JSON answer in prose ("Perfect! Here is...")
// or markdown code fences, which breaks a naive JSON.parse on the whole text block.
// extractJson recovers the JSON object from those common shapes.

// Scan from the first "{" to its matching "}", ignoring braces inside string literals.
function firstBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(text: string): unknown {
  // 1. Already-clean JSON.
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // 2. Fenced code block (```json ... ``` or ``` ... ```).
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }

  // 3. First balanced { ... } object embedded in surrounding prose.
  const balanced = firstBalancedObject(text);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // fall through
    }
  }

  throw new Error(`Could not extract JSON from model output: ${text.slice(0, 200)}`);
}
