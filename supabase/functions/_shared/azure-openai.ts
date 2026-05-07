// Shared Azure OpenAI helper for Supabase Edge Functions (Deno runtime).
//
// Uses fetch directly against the Azure OpenAI REST API. Avoids the @azure/openai
// SDK because it relies on Node-only APIs that don't run cleanly in Deno.

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

export type AzureChatMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

export type AzureChatRequest = {
  deployment: "vision" | "coach" | "quick";
  messages: AzureChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
};

export async function azureChat(req: AzureChatRequest) {
  const endpoint = env.get("AZURE_OPENAI_ENDPOINT");
  const apiKey = env.get("AZURE_OPENAI_API_KEY");
  const defaultApiVersion =
    env.get("AZURE_OPENAI_API_VERSION") ?? "2024-12-01-preview";

  const deploymentEnvKey = {
    vision: "AZURE_OPENAI_DEPLOYMENT_VISION",
    coach: "AZURE_OPENAI_DEPLOYMENT_COACH",
    quick: "AZURE_OPENAI_DEPLOYMENT_QUICK",
  }[req.deployment];

  const apiVersionOverrideKey = {
    vision: "AZURE_OPENAI_API_VERSION_VISION",
    coach: "AZURE_OPENAI_API_VERSION_COACH",
    quick: "AZURE_OPENAI_API_VERSION_QUICK",
  }[req.deployment];

  let deployment = env.get(deploymentEnvKey);
  // Fallback to vision deployment if coach or quick is missing
  if (!deployment) {
    deployment = env.get("AZURE_OPENAI_DEPLOYMENT_VISION");
  }

  const apiVersion = env.get(apiVersionOverrideKey) || defaultApiVersion;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      `Missing Azure OpenAI config: endpoint=${!!endpoint}, key=${!!apiKey}, deployment(${req.deployment})=${!!deployment}`,
    );
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: req.messages,
      max_completion_tokens: req.max_tokens ?? 1000,
      ...(req.response_format ? { response_format: req.response_format } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    const reason = data.choices?.[0]?.finish_reason ?? "unknown";
    if (reason === "content_filter") {
      throw new Error("Response blocked by content filter");
    }
    throw new Error(
      `Empty response from model. finish_reason=${reason}, raw=${JSON.stringify(data).substring(0, 500)}`,
    );
  }
  return {
    content,
    usage: data.usage,
    raw: data,
  };
}
