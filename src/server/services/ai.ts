
/**
 * AI study companion. Acts as a quest guide — explains objectives, breaks them
 * into steps, gives hints, and recommends review. It never grants mastery;
 * only application-defined assessment rules can change mastery state.
 *
 * Degrades gracefully: when no AI provider is configured, returns static,
 * helpful guidance derived from the content itself.
 */

import { env } from "@/lib/env";
import { getAiConfig } from "@/lib/env";

export interface AiGuidance {
  text: string;
  source: "ai" | "static";
  hints: string[];
}

export interface StudyCompanionContext {
  currentQuest?: { title: string; description: string; reason?: string };
  currentTopic?: { title: string; explanation?: string; difficulty: string };
  masteryTier?: string;
}

/**
 * Generate guidance for the learner. Falls back to static guidance when no AI
 * provider is configured or the request fails.
 */
export async function guide(
  context: StudyCompanionContext,
  userQuestion: string,
): Promise<AiGuidance> {
  const config = getAiConfig();

  if (!config.configured) {
    return staticGuidance(context, userQuestion);
  }

  try {
    const system = `
You are Pathforge's AI study companion. You guide learners through quests and
topics but NEVER grant mastery or award XP. Only the application's assessment
rules can update mastery.

Guidance principles:
- Be concise, encouraging, and educationally focused.
- Break objectives into small steps.
- Give progressive hints, not direct answers.
- Explain why an answer was incorrect when reviewing.
- Recommend prerequisite review when gaps are detected.
- Never invent quests, topics, or resources that do not exist.
- If you don't know, say so and suggest the learner continue with the lesson.

Context:
${JSON.stringify(context, null, 2)}

Learner question: "${userQuestion}"
`;

    const response = await fetch(`${config.provider === "openai"
      ? env.OPENAI_BASE_URL
      : config.provider === "gemini"
        ? env.GEMINI_BASE_URL
        : env.OLLAMA_BASE_URL
    }/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.provider === "openai" || config.provider === "gemini"
          ? { Authorization: `Bearer ${
              config.provider === "openai" ? env.OPENAI_API_KEY : env.GEMINI_API_KEY
            }` }
          : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userQuestion },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`AI provider error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const hints = extractHints(text);

    return { text, source: "ai", hints };
  } catch {
    return staticGuidance(context, userQuestion);
  }
}

function staticGuidance(
  context: StudyCompanionContext,
  userQuestion: string,
): AiGuidance {
  const lines: string[] = [];
  const hints: string[] = [];

  if (context.currentQuest) {
    lines.push(
      `Quest: ${context.currentQuest.title}. ${context.currentQuest.description}`,
    );
    if (context.currentQuest.reason) {
      lines.push(`Why this quest: ${context.currentQuest.reason}`);
    }
    hints.push("Break the objective into the smallest first step and start there.");
  }

  if (context.currentTopic) {
    lines.push(
      `Topic: ${context.currentTopic.title} (${context.currentTopic.difficulty}).`,
    );
    if (context.currentTopic.explanation) {
      lines.push(context.currentTopic.explanation);
    }
  }

  if (context.masteryTier) {
    lines.push(`Current mastery: ${context.masteryTier}.`);
  }

  if (!lines.length) {
    lines.push(
      "Keep going — complete the next lesson or practice exercise to advance.",
    );
  }

  lines.push(
    "Note: AI study companion is running in static mode. Configure an AI provider for personalized hints.",
  );

  hints.push("Reread the lesson explanation before attempting the check.");
  hints.push("Try explaining the concept in your own words.");

  return {
    text: lines.join(" "),
    source: "static",
    hints,
  };
}

function extractHints(text: string): string[] {
  return text
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 4);
}

