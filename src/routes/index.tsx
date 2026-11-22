import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import mark from "@/assets/speakwell-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpeakWell — Your English practice space" },
      { name: "description", content: "A personal space for building confidence in spoken English." },
      { property: "og:title", content: "SpeakWell — Your English practice space" },
      { property: "og:description", content: "A personal space for building confidence in spoken English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) {
        void navigate({ to: "/dashboard", replace: true });
      } else {
        setChecking(false);
      }
    }).catch(() => {
      if (active) setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-6 py-5 sm:px-10">
        <img alt="" className="size-10" height={40} src={mark} width={40} />
        <span className="font-display text-xl font-extrabold">SpeakWell</span>
      </header>
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-2xl">
          <p className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase text-primary">
            <MessageCircle className="size-4" aria-hidden="true" /> YOUR VOICE, YOUR PACE
          </p>
          <h1 className="font-display text-5xl font-extrabold leading-tight sm:text-6xl">
            Make room for better conversations.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Build confidence in English, one conversation at a time.
          </p>
          {checking ? (
            <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Opening your learning space…
            </p>
          ) : (
            <Button asChild className="mt-10" size="lg">
              <Link to="/auth">
                Sign in or create an account <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}