import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail, MessageCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import mark from "@/assets/speakwell-mark.png";

const searchSchema = z.object({ redirect: z.string().optional() });
export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — SpeakWell" },
      { name: "description", content: "Sign in to continue your English speaking practice." },
      { property: "og:title", content: "Sign in — SpeakWell" },
      { property: "og:description", content: "Continue your personal English speaking practice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (alive && data.user) void navigate({ to: safeRedirect(search.redirect) });
    });
    return () => { alive = false; };
  }, [navigate, search.redirect]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect(search.redirect)}`,
            data: { full_name: displayName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await navigate({ to: safeRedirect(search.redirect) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const signInSocial = async (provider: "google" | "lovable") => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: safeRedirect(search.redirect) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-[1.06fr_.94fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,var(--color-primary-foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-primary-foreground)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="relative flex items-center gap-3">
          <img src={mark} alt="" width={44} height={44} />
          <span className="font-display text-xl font-extrabold">SpeakWell</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-6 flex items-center gap-2 text-sm font-medium text-primary-foreground/75"><MessageCircle className="size-4" /> YOUR ENGLISH, FINDING ITS VOICE</p>
          <h1 className="font-display text-6xl font-extrabold leading-[1.07]">Speak with<br />more <span className="text-accent">confidence.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-primary-foreground/75">A calm place to practice, find the right words, and grow into the speaker you want to be.</p>
          <div className="mt-12 flex items-center gap-4 border-t border-primary-foreground/20 pt-6 text-sm text-primary-foreground/70">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="grid size-9 place-items-center rounded-full border-2 border-primary bg-accent font-semibold text-accent-foreground">A</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-primary bg-secondary font-semibold text-secondary-foreground">M</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-primary bg-muted font-semibold text-foreground">S</span>
            </div>
            <span>Small practice. Real progress.</span>
          </div>
        </div>
        <p className="relative text-xs text-primary-foreground/60">Your practice space, ready whenever you are.</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-14">
        <div className="w-full max-w-[420px]">
          <div className="mb-11 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/" })}><ArrowLeft /> Home</Button>
            <span className="text-sm text-muted-foreground">{mode === "signin" ? "New here?" : "Already learning?"} <button className="font-semibold text-primary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create an account" : "Sign in"}</button></span>
          </div>
          <div className="mb-8 flex items-center gap-3 lg:hidden"><img src={mark} alt="" width={40} height={40} /><span className="font-display text-xl font-extrabold">SpeakWell</span></div>
          <p className="text-sm font-semibold uppercase text-primary">YOUR VOICE, YOUR PACE</p>
          <h2 className="font-display mt-3 text-4xl font-extrabold">{mode === "signin" ? "Welcome back." : "Let’s get started."}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{mode === "signin" ? "Pick up where your English practice left off." : "Make a little space for better conversations."}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => void signInSocial("google")}><GoogleMark /> Continue with Google</Button>
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => void signInSocial("lovable")}>Continue with Lovable</Button>
          </div>
          <div className="my-7 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OR CONTINUE WITH EMAIL<span className="h-px flex-1 bg-border" /></div>
          <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
            {mode === "signup" && <div className="space-y-2"><Label htmlFor="display-name">Name</Label><Input id="display-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} required /></div>}
            <div className="space-y-2"><Label htmlFor="email">Email address</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required /></div></div>
            <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="password">Password</Label>{mode === "signin" && <button type="button" className="text-xs font-semibold text-primary" onClick={async () => { if (!email) { toast.error("Enter your email address first."); return; } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) toast.error(error.message); else toast.success("Password reset instructions sent."); }}>Forgot password?</button>}</div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" id="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.currentTarget.value)} required /></div></div>
            <Button className="h-11 w-full" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" /> : null}{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Your conversations and practice history are private to your account.</p>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] shrink-0"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;
}