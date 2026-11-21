import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  BookOpenText,
  ChartNoAxesCombined,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MessageSquareText,
  Mic2,
  Moon,
  Presentation,
  Settings2,
  Sun,
  Trophy,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import mark from "@/assets/speakwell-mark.png";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/practice", label: "Practice studio", icon: Mic2 },
  { to: "/topics", label: "Topic library", icon: LibraryBig },
  { to: "/coach", label: "AI coach", icon: MessageSquareText },
  { to: "/recordings", label: "My recordings", icon: Video },
  { to: "/progress", label: "Performance", icon: ChartNoAxesCombined },
  { to: "/plan", label: "Learning plan", icon: BookOpenText },
  { to: "/pronunciation", label: "Pronunciation lab", icon: AudioLines },
  { to: "/grammar", label: "Grammar & vocabulary", icon: BookOpenText },
  { to: "/public-speaking", label: "Public speaking", icon: Presentation },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const enabled = window.localStorage.getItem("speakwell-theme") === "dark";
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("speakwell-theme", next ? "dark" : "light");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out could not be completed.");
      return;
    }
    await navigate({ to: "/auth", replace: true });
  };

  const navLinks = navigation.map(({ to, label, icon: Icon }) => {
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
        key={to}
        to={to}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link aria-label="SpeakWell dashboard" className="mb-7 flex items-center gap-3 px-2" to="/dashboard">
          <img alt="" className="size-10" height={40} src={mark} width={40} />
          <span className="font-display text-xl font-extrabold text-sidebar-foreground">SpeakWell</span>
        </Link>
        <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {navLinks}
        </nav>
        <div className="mt-5 border-t border-sidebar-border pt-4">
          <Button className="w-full justify-start text-sidebar-foreground" onClick={() => void signOut()} variant="ghost">
            <LogOut aria-hidden="true" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-border bg-background px-4 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <Link aria-label="SpeakWell dashboard" className="flex items-center gap-2" to="/dashboard">
              <img alt="" className="size-8" height={32} src={mark} width={32} />
              <span className="font-display font-bold">SpeakWell</span>
            </Link>
            <Button aria-label="Sign out" onClick={() => void signOut()} size="icon" title="Sign out" variant="ghost">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto pb-1">
            {navLinks}
          </nav>
        </div>

        <header className="flex min-h-24 items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-primary">SpeakWell learning space</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Button aria-label={dark ? "Use light appearance" : "Use dark appearance"} className="shrink-0" onClick={toggleTheme} size="icon" title="Change appearance" variant="outline">
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}