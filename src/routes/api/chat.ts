import { createFileRoute } from "@tanstack/react-router";
import { handleCoachChat } from "@/lib/chat.server";

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handleCoachChat(request) } },
});