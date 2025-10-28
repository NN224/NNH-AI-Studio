import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export function checkRequiredEnvVars(vars: string[]): { valid: boolean; missing: string[] } {
  const missing = vars.filter((v) => !Deno.env.get(v));
  return { valid: missing.length === 0, missing };
}

export function getEnv(name: string, fallback?: string): string | undefined {
  const v = Deno.env.get(name);
  if (v && v.length > 0) return v;
  return fallback;
}
