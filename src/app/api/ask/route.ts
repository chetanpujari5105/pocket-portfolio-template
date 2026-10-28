import { AskRequestSchema, type AskResult } from "@/lib/ask";
import { SYSTEM_PROMPT } from "@/lib/ask-knowledge";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const json = (body: AskResult, status: number) => Response.json(body, { status });

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_ASK !== "true") return json({ ok: false, reason: "unavailable" }, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid" }, 400);
  }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, reason: "invalid" }, 400);

  const limit = rateLimit(`ask:${clientIp(request)}`, 15, 60 * 60 * 1000);
  if (!limit.ok) return json({ ok: false, reason: "rate-limited" }, 429);

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ ok: false, reason: "unavailable" }, 503);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.data.messages],
        max_completion_tokens: 1200,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("OpenAI: empty reply");
    return json({ ok: true, reply }, 200);
  } catch (error) {
    console.error("ask: failed", error);
    return json({ ok: false, reason: "failed" }, 502);
  }
}
