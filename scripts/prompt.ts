import { createInterface } from "node:readline";

// Asks questions one by one in the terminal (also works when answers are piped in).
const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();

export async function ask(question: string): Promise<string> {
  process.stdout.write(question);
  const { value } = await lines.next();
  return String(value ?? "").trim();
}

export function closePrompt() {
  rl.close();
}
