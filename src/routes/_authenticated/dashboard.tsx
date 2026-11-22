import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpenText, MessageSquareText, Mic2 } from "lucide-react";
import { AppShell } from "@/components/speakwell/app-shell";
import { speakwellOverviewQuery } from "@/lib/speakwell.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(speakwellOverviewQuery),
  head: () => ({
    meta: [
      { title: "Your dashboard — SpeakWell" },
      { name: "description", content: "Your private English practice and coaching overview." },
      { property: "og:title", content: "Your dashboard — SpeakWell" },
      { property: "og:description", content: "Your private English practice and coaching overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(speakwellOverviewQuery);
  const firstName = data.profile?.display_name.trim().split(/\s+/)[0] || "there";
  const totalMinutes = Math.round(data.sessions.reduce((total, session) => total + session.duration_seconds, 0) / 60);

  const stats = [
    { label: "Practice sessions", value: data.sessions.length, icon: Mic2 },
    { label: "Minutes practiced", value: totalMinutes, icon: BookOpenText },
    { label: "Coach conversations", value: data.conversations.length, icon: MessageSquareText },
  ];

  return (
    <AppShell title="Your dashboard" subtitle="A private view of your English practice and saved conversations.">
      <section className="mb-8">
        <p className="text-sm font-medium text-primary">Welcome back, {firstName}</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold">Your progress, at a glance.</h2>
      </section>

      <section aria-label="Learning summary" className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <article className="border border-border bg-card p-5" key={label}>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <h3 className="text-sm font-medium">{label}</h3>
            </div>
            <p className="mt-5 font-display text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="recent-practice-heading" className="mt-10 border-t border-border pt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold" id="recent-practice-heading">Recent practice</h2>
          <p className="text-sm text-muted-foreground">Only you can see this account activity.</p>
        </div>
        {data.sessions.length === 0 ? (
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your saved practice sessions and coaching conversations will appear here as you use SpeakWell.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {data.sessions.slice(0, 5).map((session) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={session.id}>
                <div>
                  <p className="font-medium">{session.topic}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{session.mode.replaceAll("-", " ")}</p>
                </div>
                <time className="text-sm text-muted-foreground" dateTime={session.created_at}>
                  {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}