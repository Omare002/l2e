import { useEffect, useRef, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { myProfileQuery } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationBell } from "@/components/messages/notification-bell";
import { conversationsQuery } from "@/lib/messaging";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/projects", label: "Projects" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/quests", label: "Quests" },
] as const;

const COMMUNITY = [
  { to: "/community", label: "Community Feed" },
  { to: "/builders", label: "Builders" },
  { to: "/forum", label: "Forums" },
] as const;

const NAV_TAIL = [
  { to: "/hall-of-fame", label: "Hall of Fame" },
  { to: "/how-it-works", label: "How it works" },
] as const;

const LINK =
  "relative whitespace-nowrap py-1 text-[13.5px] text-foreground/70 transition-colors duration-200 hover:text-foreground";
const LINK_ACTIVE = {
  className:
    "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
};

const EASE = [0.22, 1, 0.36, 1] as const;


export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { userId, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    ...myProfileQuery(userId ?? ""),
    enabled: Boolean(userId),
  });

  const { data: conversations } = useQuery(conversationsQuery(userId));
  const unreadThreads = (conversations ?? []).filter((c) => {
    const mine = c.user_a === userId ? c.read_a_at : c.read_b_at;
    const pendingForMe = c.status === "pending" && c.requester_id !== userId;
    return pendingForMe || !mine || new Date(c.last_message_at) > new Date(mine);
  }).length;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const monogram = (
    <UserAvatar
      name={profile?.display_name ?? "You"}
      path={profile?.avatar_url}
      accent={profile?.accent_color}
      size={32}
      eager
    />
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-navbar/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 2xl:max-w-[1400px]">
        <Link
          to="/"
          className="group flex shrink-0 items-center pr-2 sm:pr-3"
          aria-label="Leaderboard home"
        >
          {logoError ? (
            <div className="flex h-5 items-center gap-1.5 sm:h-6" aria-hidden>
              <span className="size-2 rounded-full bg-neon" />
              <span className="font-mono text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
                Leaderboard
              </span>
            </div>
          ) : (
            <img
              src={logo}
              alt="Leaderboard"
              width={1266}
              height={210}
              onError={() => setLogoError(true)}
              className="h-7 w-auto transition-opacity duration-200 group-hover:opacity-80 dark:invert"
            />
          )}
        </Link>

        <nav className="hidden items-center gap-4 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative whitespace-nowrap py-1 text-[13.5px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
              activeProps={{
                className:
                  "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
              }}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link
              to="/messages"
              className="relative whitespace-nowrap py-1 text-[13.5px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
              activeProps={{
                className:
                  "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
              }}
            >
              Messages
              {unreadThreads > 0 ? (
                <span className="absolute -right-3 top-0 size-1.5 rounded-full bg-neon" />
              ) : null}
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <Link
            to="/submit"
            className={cn(
              "glass-pill hidden px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-neon/40 hover:text-neon",
              isAuthenticated ? "2xl:inline-flex" : "xl:inline-flex",
            )}
          >
            Submit project
          </Link>


          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 text-[13px] transition-colors duration-200 hover:border-border xl:inline-flex"
            >
              {monogram}
              <span className="max-w-[7rem] truncate">
                {profile?.display_name ?? "Dashboard"}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 xl:inline-flex"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-11 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-200 hover:border-neon xl:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden border-t border-border bg-navbar xl:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                  activeProps={{ className: "text-foreground" }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/submit"
                className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                Submit project
              </Link>
              <div className="flex min-h-12 items-center justify-between border-b border-border/70 text-[14px] text-foreground/70">
                Theme
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/messages"
                    className="flex min-h-12 items-center gap-2 border-b border-border/70 text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                    activeProps={{ className: "text-foreground" }}
                  >
                    Messages
                    {unreadThreads > 0 ? <span className="size-1.5 rounded-full bg-neon" /> : null}
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex min-h-12 items-center gap-3 border-b border-border/70 text-[14px] text-foreground/70"
                    activeProps={{ className: "text-foreground" }}
                  >
                    {monogram}
                    <span className="truncate">{profile?.display_name ?? "Dashboard"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex min-h-12 items-center gap-2 text-left text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="my-3 flex min-h-12 items-center justify-center rounded-full bg-foreground text-[14px] font-medium text-background"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
