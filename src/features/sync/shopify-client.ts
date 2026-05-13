import { getShopifyEnv, hasShopifyEnv } from "@/lib/env";

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function shopifyGraphQL<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  if (!hasShopifyEnv()) {
    throw new Error("Missing Shopify environment variables.");
  }

  const { shopDomain, adminAccessToken, apiVersion } = getShopifyEnv();
  const response = await fetch(
    `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken!,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  const json = (await response.json()) as ShopifyGraphQLResponse<T>;

  if (!response.ok) {
    throw new Error(
      json.errors?.map((item) => item.message).join("; ") ||
        `Shopify request failed with status ${response.status}.`,
    );
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((item) => item.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Shopify response did not include data.");
  }

  return json.data;
}
