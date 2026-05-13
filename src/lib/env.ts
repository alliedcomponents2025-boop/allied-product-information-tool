const requiredPublicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export function getMissingPublicEnv() {
  return Object.entries(requiredPublicEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function hasSupabaseEnv() {
  return getMissingPublicEnv().length === 0;
}

export function getSupabaseEnv() {
  const missing = getMissingPublicEnv();

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    appUrl: requiredPublicEnv.NEXT_PUBLIC_APP_URL!,
    supabaseUrl: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  };
}

export function getShopifyEnv() {
  return {
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
    adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION ?? "2026-01",
  };
}

export function hasShopifyEnv() {
  const { shopDomain, adminAccessToken } = getShopifyEnv();
  return Boolean(shopDomain && adminAccessToken);
}
