import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

let cachedAdminClient;

function findWorkspaceRoot() {
  let current = process.cwd();
  for (let depth = 0; depth < 8; depth += 1) {
    if (
      existsSync(path.join(current, "package.json"))
      && existsSync(path.join(current, "supabase"))
      && existsSync(path.join(current, "src"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function loadOptionalEnvFile(envPath) {
  if (!existsSync(envPath)) return;
  loadDotenv({ path: envPath, override: false, quiet: true });
}

export function loadSellerSignalEnv() {
  const workspaceRoot = findWorkspaceRoot();
  const envPaths = [
    path.join(workspaceRoot, ".env"),
    path.join(process.cwd(), ".env"),
  ];

  for (const envPath of [...new Set(envPaths)]) {
    loadOptionalEnvFile(envPath);
  }
}

loadSellerSignalEnv();

export function readSupabaseConfig() {
  return {
    url:
      process.env.SELLER_SIGNAL_SUPABASE_URL
      || process.env.SUPABASE_URL
      || process.env.VITE_SUPABASE_URL
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || "",
    publishableKey:
      process.env.SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY
      || process.env.SELLER_SIGNAL_SUPABASE_ANON_KEY
      || process.env.SUPABASE_PUBLISHABLE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.VITE_SUPABASE_ANON_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || "",
    serviceRoleKey:
      process.env.SELLER_SIGNAL_SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || "",
  };
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const { url, serviceRoleKey } = readSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error("Seller Signal MCP requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (serviceRoleKey.startsWith("sbp_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY looks like a personal access token. Use the project service_role key.");
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedAdminClient;
}
