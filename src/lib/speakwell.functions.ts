import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("coach_conversations")
      .insert({ user_id: context.userId, title: "New conversation" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error("A new coaching conversation could not be created.");
    return data;
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [conversationResult, profileResult, sessionResult, assessmentResult] = await Promise.all([
      context.supabase
        .from("coach_conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false })
        .limit(30),
      context.supabase
        .from("profiles")
        .select("display_name, learning_level, learning_goals, preferred_english, daily_target_minutes")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("practice_sessions")
        .select("id, topic, duration_seconds, created_at, attempt")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("speaking_assessments")
        .select("category_scores, feedback, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (conversationResult.error || profileResult.error || sessionResult.error || assessmentResult.error) {
      throw new Error("Your learning data could not be loaded.");
    }

    return {
      conversations: conversationResult.data ?? [],
      profile: profileResult.data,
      sessions: sessionResult.data ?? [],
      assessments: assessmentResult.data ?? [],
    };
  });

export const loadConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { data: conversation, error: conversationError } = await context.supabase
      .from("coach_conversations")
      .select("id, title, created_at, updated_at")
      .eq("id", input.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (conversationError || !conversation) throw new Error("This conversation is unavailable.");

    const { data: rows, error } = await context.supabase
      .from("coach_messages")
      .select("message_id, role, parts")
      .eq("conversation_id", input.id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Conversation history could not be loaded.");

    const messages: Array<{ id: string; role: "user" | "assistant"; parts: Array<{ type: string; text?: string }> }> =
      (rows ?? []).map((row) => ({
        id: row.message_id,
        role: row.role === "assistant" ? "assistant" : "user",
        parts: Array.isArray(row.parts) ? row.parts as Array<{ type: string; text?: string }> : [],
      }));
    return { conversation, messages };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    displayName: string;
    learningLevel: string;
    learningGoals: string;
    preferredEnglish: string;
    dailyTargetMinutes: number;
  }) => input)
  .handler(async ({ data: input, context }) => {
    if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(input.learningLevel)) {
      throw new Error("Choose a supported learning level.");
    }
    if (!Number.isInteger(input.dailyTargetMinutes) || input.dailyTargetMinutes < 1 || input.dailyTargetMinutes > 180) {
      throw new Error("Daily practice goals must be from 1 to 180 minutes.");
    }
    const { error } = await context.supabase.from("profiles").upsert({
      user_id: context.userId,
      display_name: input.displayName.slice(0, 80),
      learning_level: input.learningLevel,
      learning_goals: input.learningGoals.slice(0, 500),
      preferred_english: input.preferredEnglish.slice(0, 60),
      daily_target_minutes: input.dailyTargetMinutes,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Your learning preferences could not be saved.");
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase
      .from("coach_conversations")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("This conversation could not be deleted.");
    return { ok: true };
  });

export const createVoiceTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("voice_session_tickets").insert({
      user_id: context.userId,
      token_hash: tokenHash,
      audience_path: "/api/live",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    if (error) throw new Error("A secure voice session could not be started.");
    return { token, expiresInSeconds: 60 };
  });