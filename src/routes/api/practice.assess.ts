import { createFileRoute } from "@tanstack/react-router";
import { handlePracticeAssessment } from "@/lib/practice-ai.server";

export const Route = createFileRoute("/api/practice/assess")({
  server: { handlers: { POST: ({ request }) => handlePracticeAssessment(request) } },
});