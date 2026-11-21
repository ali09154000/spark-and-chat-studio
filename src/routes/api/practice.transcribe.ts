import { createFileRoute } from "@tanstack/react-router";
import { handlePracticeTranscription } from "@/lib/practice-ai.server";

export const Route = createFileRoute("/api/practice/transcribe")({
  server: { handlers: { POST: ({ request }) => handlePracticeTranscription(request) } },
});