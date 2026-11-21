import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseTranscriptAssessment } from "@/lib/practice-assessment";

type AuthenticatedData = {
  accessToken: string;
  db: ReturnType<typeof createClient<Database>>;
  userId: string;
};

function createRequestClient(url: string, key: string, accessToken: string) {
  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: (input, init) => {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticateRequest(request: Request): Promise<AuthenticatedData | Response> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key) return new Response("Practice services are unavailable.", { status: 503 });
  if (!accessToken || accessToken.split(".").length !== 3) {
    return new Response("Sign in to continue.", { status: 401 });
  }
  const db = createRequestClient(url, key, accessToken);
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user) return new Response("Please sign in again.", { status: 401 });
  return { accessToken, db, userId: data.user.id };
}

function isResponse(value: AuthenticatedData | Response): value is Response {
  return value instanceof Response;
}

function responseText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || !("text" in value)) return null;
  return typeof value.text === "string" ? value.text : null;
}

function readResponseText(response: { output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }): string {
  return response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

export async function handlePracticeTranscription(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return new Response("A recording file is required.", { status: 415 });
  }
  const authenticated = await authenticateRequest(request);
  if (isResponse(authenticated)) return authenticated;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("The recording could not be read.", { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 30 * 1024 * 1024) {
    return new Response("Choose an audio recording under 30 MB.", { status: 400 });
  }
  const audioType = file.type.split(";")[0]?.toLowerCase();
  const supportedTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/flac"];
  if (!audioType || !supportedTypes.includes(audioType)) {
    return new Response("This audio format is not supported for transcription.", { status: 415 });
  }

  try {
    const { transcribeAudio } = await import("@lovable.dev/ai-gateway");
    const result = await transcribeAudio({
      model: "openai/gpt-transcribe",
      file,
      language: "en",
      response_format: "json",
    });
    const transcript = responseText(result)?.trim();
    if (!transcript) return new Response("No speech was found in this recording.", { status: 422 });
    return Response.json({ transcript });
  } catch (error) {
    console.error("SpeakWell transcription did not complete", error instanceof Error ? error.name : "UnknownError");
    return new Response("Transcription is temporarily unavailable. You can enter the transcript manually.", { status: 503 });
  }
}

export async function handlePracticeAssessment(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "A saved practice session and transcript are required." }, { status: 415 });
  }
  const authenticated = await authenticateRequest(request);
  if (isResponse(authenticated)) return authenticated;

  let payload: { sessionId?: unknown; transcript?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "The transcript could not be read." }, { status: 400 });
  }
  const sessionId = payload.sessionId;
  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim() : "";
  if (
    typeof sessionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId) ||
    transcript.length < 8 ||
    transcript.length > 12_000
  ) {
    return Response.json({ error: "Add a short transcript before requesting feedback." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await authenticated.db
    .from("practice_sessions")
    .select("id, topic")
    .eq("id", sessionId)
    .eq("user_id", authenticated.userId)
    .maybeSingle();
  if (sessionError || !session) return Response.json({ error: "This practice session is unavailable." }, { status: 404 });

  const { data: profile } = await authenticated.db
    .from("profiles")
    .select("learning_level, learning_goals, preferred_english")
    .eq("user_id", authenticated.userId)
    .maybeSingle();

  const { error: transcriptError } = await authenticated.db
    .from("practice_sessions")
    .update({ transcript })
    .eq("id", session.id)
    .eq("user_id", authenticated.userId);
  if (transcriptError) return Response.json({ error: "The transcript could not be saved." }, { status: 500 });

  try {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const response = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: [
        "You are an evidence-based English speaking coach. Evaluate only what the transcript can support.",
        `Adapt explanations to CEFR level ${profile?.learning_level ?? "B1"} and ${profile?.preferred_english ?? "International English"}.`,
        profile?.learning_goals ? `Learner goals: ${profile.learning_goals}.` : "",
        "Do not assess pronunciation, voice quality, pace, pauses, fillers, confidence, eye contact, body language, or video. Those require audio or video and are not supplied.",
        "Scores must be integer estimates from 0 to 100 and supported by the transcript; do not invent errors or quote text that is absent.",
        "Return a JSON object only with categoryScores (grammar, fluency, vocabulary, communication), strengths (up to 4 short strings), corrections (up to 5 objects with said, natural, why, example), priorities (up to 3 objects with level, focus, why, practice, minutes, successSignal), polishedVersion, and summary.",
        "Priority level must be critical, high, moderate, or easy-win. Practice minutes must be an integer from 1 to 60. If the transcript is too short to support a category, use a conservative score and state the limitation in summary.",
      ].filter(Boolean).join("\n"),
      input: `Return JSON only. Practice topic: ${session.topic}\n\nTranscript:\n${transcript}`,
      text: { format: { type: "json_object" } },
    });
    const assessment = parseTranscriptAssessment(JSON.parse(readResponseText(response)) as unknown);
    const categoryScores = {
      overall: assessment.overallScore,
      transcriptBased: true,
      categories: assessment.categoryScores,
      pronunciation: null,
      presentation: null,
    };
    const { error: saveError } = await authenticated.db
      .from("speaking_assessments")
      .upsert({
        user_id: authenticated.userId,
        practice_session_id: session.id,
        category_scores: categoryScores,
        feedback: JSON.stringify(assessment),
      }, { onConflict: "practice_session_id" });
    if (saveError) throw new Error("Assessment could not be saved");
    return Response.json({ assessment });
  } catch (error) {
    console.error("SpeakWell transcript assessment did not complete", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "The coach could not complete this assessment. Your transcript is saved; try again later." }, { status: 503 });
  }
}