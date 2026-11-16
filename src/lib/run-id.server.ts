import { createLovableAiGatewayRunIdFetch } from "@/lib/gateway-run-id";

export { createLovableAiGatewayRunIdFetch };

export async function withLovableAiGatewayRunIdHeader(
  response: Response,
  gateway: { getRunId: () => string | undefined; waitForRunId: () => Promise<string | undefined> },
  init?: HeadersInit,
  options?: { waitForUpstreamHeaders?: boolean },
): Promise<Response> {
  const headers = new Headers(response.headers);
  const extraHeaders = new Headers(init);
  extraHeaders.forEach((value, name) => headers.set(name, value));
  const runId = options?.waitForUpstreamHeaders === false ? gateway.getRunId() : await gateway.waitForRunId();
  if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);

  const stream = response.body;
  if (!stream || options?.waitForUpstreamHeaders === false) {
    return new Response(stream, { status: response.status, statusText: response.statusText, headers });
  }
  const reader = stream.getReader();
  const firstChunk = reader.read();
  await gateway.waitForRunId();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const first = await firstChunk;
        if (first.done) controller.close();
        else {
          controller.enqueue(first.value);
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            controller.enqueue(next.value);
          }
          controller.close();
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}