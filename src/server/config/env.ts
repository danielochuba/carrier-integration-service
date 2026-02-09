export type NodeEnv = "development" | "production" | "test";

export interface Env {
  NODE_ENV: NodeEnv;
  PORT: number;
}

const REQUIRED_KEYS = ["NODE_ENV"] as const;

const DEFAULT_PORT = 3000;

function parsePort(value: string | undefined): number {
  if (value === undefined || value === "") return DEFAULT_PORT;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) return DEFAULT_PORT;
  return n;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }
  return "development";
}

export function loadEnv(): Env {
  const raw = process.env;

  for (const key of REQUIRED_KEYS) {
    const value: string | undefined = raw[key];
    if (value === undefined || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    NODE_ENV: parseNodeEnv(raw.NODE_ENV),
    PORT: parsePort(raw.PORT),
  };
}
