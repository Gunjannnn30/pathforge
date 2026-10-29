import { z } from "zod";

const boolFromString = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  AI_PROVIDER: z.enum(["none", "ollama", "openai", "gemini"]).default("none"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(60000),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_BASE_URL: z.string().default("https://generativelanguage.googleapis.com/v1beta/openai"),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(25),

  PG_PORT: z.coerce.number().int().default(5432),
  PG_USER: z.string().default("postgres"),
  PG_PASSWORD: z.string().default("postgres"),
  PG_DATABASE: z.string().default("pathforge"),
  PG_TEST_DATABASE: z.string().default("pathforge_test"),
  PG_DATA_DIR: z.string().default(".pgdata"),
});

function loadEnv() {
  const source = {
    ...process.env,
    APP_URL: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
  };
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export type AiProviderName = "ollama" | "openai" | "gemini";
export type AiProviderSetting = AiProviderName | "none";

export function getAiConfig() {
  const provider = env.AI_PROVIDER;
  if (provider === "none") {
    return { configured: false, provider: "none", model: "", missing: ["AI_PROVIDER"] } as const;
  }
  if (provider === "ollama") {
    return { configured: true, provider, model: env.OLLAMA_MODEL, missing: [] } as const;
  }
  if (provider === "gemini") {
    const missing = env.GEMINI_API_KEY ? [] : ["GEMINI_API_KEY"];
    return {
      configured: missing.length === 0,
      provider,
      model: env.GEMINI_MODEL,
      missing,
    } as const;
  }
  const missing = env.OPENAI_API_KEY ? [] : ["OPENAI_API_KEY"];
  return {
    configured: missing.length === 0,
    provider,
    model: env.OPENAI_MODEL,
    missing,
  } as const;
}

export type AiConfig = ReturnType<typeof getAiConfig>;
