import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/gateway-run-id";
export { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/gateway-run-id";
export { withLovableAiGatewayRunIdHeader } from "@/lib/gateway-run-id";

export function createLovableAiGatewayProvider(
  apiKey: string,
  initialRunId: string | undefined,
  baseURL: string,
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAI({
    baseURL: `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return Object.assign(provider, {
    getRunId: runIdFetch.getRunId,
    waitForRunId: runIdFetch.waitForRunId,
  });
}