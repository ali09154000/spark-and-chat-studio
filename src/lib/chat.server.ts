import { convertToModelMessages, streamText, validateUIMessages, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";
import type { Database } from "@/integrations/supabase/types";
import { createClient } from "@supabase/supabase-js";

type RuntimeSupabase = ReturnType<typeof createClient<Database>>;
type StoredParts = NonNullable<Database["public"]["Tables"]["coach_messages"]["Insert"]["parts"]>;

function toStoredParts(parts: UIMessage["parts"]): StoredParts {
  return JSON.parse(JSON.stringify(parts)) as StoredParts;
}

function createRequestClient(accessToken: string): RuntimeSupabase {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Account service is unavailable.");

  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}` && key.startsWith("sb_")) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function handleCoachChat(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Invalid request." }, { status: 415 });
  }

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!bearer || bearer.split(".").length !== 3) {
    return Response.json({ error: "Sign in to continue your conversation." }, { status: 401 });
  }

  let payload: { messages?: unknown; conversationId?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const conversationId = payload.conversationId;
  if (
    typeof conversationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)
  ) {
    return Response.json({ error: "This conversation could not be found." }, { status: 400 });
  }

  const db = createRequestClient(bearer);
  const { data: userData, error: authError } = await db.auth.getUser(bearer);
  const user = userData.user;
  if (authError || !user) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  const { data: conversation, error: conversationError } = await db
    .from("coach_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (conversationError || !conversation) {
    return Response.json({ error: "This conversation is unavailable." }, { status: 404 });
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 100) {
    return Response.json({ error: "Please send a valid conversation." }, { status: 400 });
  }

  const { data: profile } = await db
    .from("profiles")
    .select("learning_level, learning_goals, preferred_english")
    .eq("user_id", user.id)
    .maybeSingle();

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: payload.messages });
  } catch {
    return Response.json({ error: "The message format is not supported." }, { status: 400 });
  }
  const lastMessage = messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return Response.json({ error: "Please send a new question." }, { status: 400 });
  }

  const messageRows = messages.map((message) => ({
    conversation_id: conversationId,
    user_id: user.id,
    message_id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    parts: toStoredParts(message.parts),
  }));
  const { error: saveUserError } = await db.from("coach_messages").upsert(messageRows, {
    onConflict: "conversation_id,message_id",
  });
  if (saveUserError) {
    console.error("Could not save the member's coach message", saveUserError.message);
    return Response.json({ error: "Your message could not be saved. Please try again." }, { status: 500 });
  }

  const title = conversation.title === "New conversation"
    ? lastMessage.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ").slice(0, 64).trim()
    : conversation.title;
  const { error: updateTitleError } = await db
    .from("coach_conversations")
    .update({ title: title || "English speaking practice", updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);
  if (updateTitleError) console.error("Could not update coach conversation title", updateTitleError.message);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "The coach is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const modelMessages = await convertToModelMessages(messages);
  const gateway = createLovableAiGatewayProvider(
    apiKey,
    getLovableAiGatewayRunId(request),
    "https://ai.gateway.lovable.dev/v1",
  );

  const result = streamText({
    model: gateway.responses("openai/gpt-6-astra"),
    messages: modelMessages,
    abortSignal: request.signal,
    maxRetries: 0,
    system: [
      "You are SpeakWell, a supportive, precise English speaking coach.",
      `Adapt explanations to CEFR level ${profile?.learning_level ?? "B1"} and preferred English variety ${profile?.preferred_english ?? "International English"}.`,
      profile?.learning_goals ? `The learner's goals: ${profile.learning_goals}.` : "",
      "Teach practical natural English. When correcting an example, show what was said, a natural correction, a concise explanation, and one short practice example. Never shame the learner, invent speech measurements, or claim to have heard a recording unless transcript/audio evidence is present.",
      "For speaking practice, offer one clear follow-up question, keeping replies warm and easy to say aloud.",
    ].filter(Boolean).join("\n"),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onEnd: async ({ messages: completeMessages, isAborted, outcome }) => {
      if (isAborted || outcome.status !== "completed") return;
      const completeRows = completeMessages.map((message) => ({
        conversation_id: conversationId,
        user_id: user.id,
        message_id: message.id,
        role: message.role === "assistant" ? "assistant" : "user",
        parts: toStoredParts(message.parts),
      }));
      const { error: saveError } = await db.from("coach_messages").upsert(completeRows, {
        onConflict: "conversation_id,message_id",
      });
      if (saveError) console.error("Could not save completed coach exchange", saveError.message);
    },
    onError: (error) => {
      console.error("SpeakWell coach response failed", error);
      return "The coach could not finish that response. Your message is still here; you can try again.";
    },
  });

  return withLovableAiGatewayRunIdHeader(response, gateway, { "Cache-Control": "no-store" });
}