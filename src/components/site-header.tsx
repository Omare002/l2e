import { useEffect, useRef, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, LogOut, Menu, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { myProfileQuery } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationBell } from "@/components/messages/notification-bell";
import { conversationsQuery } from "@/lib/messaging";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const EXPLORE = [
  { to: "/projects", label: "Projects" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/hall-of-fame", label: "Hall of Fame" },
] as const;

const COMMUNITY = [
  { to: "/quests", label: "Quests" },
  { to: "/community", label: "Community Feed" },
  { to: "/builders", label: "Builders" },
  { to: "/forum", label: "Forums" },
] as const;

const MENU_GROUPS = [
  { key: "explore", label: "Explore", items: EXPLORE },
  { key: "community", label: "Community", items: COMMUNITY },
] as const;

type MenuKey = (typeof MENU_GROUPS)[number]["key"];

const LINK =
  "relative whitespace-nowrap py-1 text-[13.5px] text-foreground/70 transition-colors duration-200 hover:text-foreground";
const LINK_ACTIVE = {
  className:
    "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
};

const EASE = [0.22, 1, 0.36, 1] as const;

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5" aria-hidden>
      <span
        className={cn(
          "truncate font-mono font-bold tracking-tight text-foreground",
          compact ? "text-[13px]" : "text-[15px] sm:text-base",
        )}
      >
        Learn<span className="text-neon">2</span>Earn
      </span>
      <span
        className={cn(
          "hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:inline",
          compact && "hidden sm:inline",
        )}
      >
        Showcase
      </span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const menuRefs = useRef<Record<MenuKey, HTMLDivElement | null>>({
    explore: null,
    community: null,
  });
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
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      const inside = (Object.keys(menuRefs.current) as MenuKey[]).some((key) =>
        menuRefs.current[key]?.contains(target),
      );
      if (!inside) setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1 px-2 md:hidden">
        <Link to="/" className="group flex min-w-0 shrink items-center" aria-label="Learn2Earn Showcase home">
          <Wordmark compact />
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle compact />
          {isAuthenticated ? (
            <Link
              to="/messages"
              aria-label={unreadThreads > 0 ? `Messages, ${unreadThreads} unread` : "Messages"}
              className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
            >
              <MessageCircle className="size-4" />
              {unreadThreads > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-neon px-1 font-mono text-[9px] font-semibold leading-4 text-neon-foreground">
                  {unreadThreads > 99 ? "99+" : unreadThreads}
                </span>
              ) : null}
            </Link>
          ) : (
            <Link
              to="/auth"
              aria-label="Sign in to view messages"
              className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
            >
              <MessageCircle className="size-4" />
            </Link>
          )}
          {isAuthenticated ? <NotificationBell compact /> : (
            <Link
              to="/auth"
              aria-label="Sign in to view notifications"
              className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
            >
              <Bell className="size-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-200 hover:border-neon"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:flex 2xl:max-w-[1400px]">
        <Link to="/" className="group flex shrink-0 items-center pr-2 sm:pr-3" aria-label="Learn2Earn Showcase home">
          <Wordmark />
        </Link>

        <nav className="flex min-w-0 items-center gap-4">
          {MENU_GROUPS.map((group) => (
            <div key={group.key} ref={(el) => { menuRefs.current[group.key] = el; }} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === group.key ? null : group.key))}
                aria-expanded={openMenu === group.key}
                aria-haspopup="menu"
                className={cn(LINK, "flex items-center gap-1", group.items.some((c) => pathname.startsWith(c.to)) && "text-foreground")}
              >
                {group.label}
                <ChevronDown className={cn("size-3.5 transition-transform duration-200", openMenu === group.key && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {openMenu === group.key ? (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }} role="menu" className="glass-panel absolute left-0 top-[calc(100%+14px)] z-50 w-48 overflow-hidden p-1.5">
                    {group.items.map((item) => <Link key={item.to} to={item.to} role="menuitem" onClick={() => setOpenMenu(null)} className="block rounded-lg px-3 py-2 text-[13px] text-foreground/75 transition-colors duration-200 hover:bg-muted/60 hover:text-foreground" activeProps={{ className: "text-foreground bg-muted/50" }}>{item.label}</Link>)}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
          <Link to="/how-it-works" className={LINK} activeProps={LINK_ACTIVE}>How it works</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to="/messages" aria-label={unreadThreads > 0 ? `Messages, ${unreadThreads} unread` : "Messages"} className="relative flex size-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground">
              <MessageCircle className="size-4" />
              {unreadThreads > 0 ? <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-neon px-1 font-mono text-[9px] font-semibold leading-4 text-neon-foreground">{unreadThreads > 99 ? "99+" : unreadThreads}</span> : null}
            </Link>
          ) : null}
          <NotificationBell />
          <Link to="/submit" className={cn("glass-pill hidden px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-neon/40 hover:text-neon", isAuthenticated ? "2xl:inline-flex" : "xl:inline-flex")}>Submit project</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="hidden items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 text-[13px] transition-colors duration-200 hover:border-border xl:inline-flex">
              {monogram}<span className="max-w-[7rem] truncate">{profile?.display_name ?? "Dashboard"}</span>
            </Link>
          ) : (
            <Link to="/auth" className="hidden rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 xl:inline-flex">Sign in</Link>
          )}
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
            className="overflow-hidden border-t border-border bg-navbar md:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
              {MENU_GROUPS.map((group) => (
                <div key={group.key} className="border-b border-border/70">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((m) => (m === group.key ? null : group.key))}
                    aria-expanded={openMenu === group.key}
                    className="flex min-h-12 w-full items-center justify-between text-left text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                  >
                    {group.label}
                    <ChevronDown className={cn("size-4 transition-transform duration-200", openMenu === group.key && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openMenu === group.key ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="overflow-hidden pb-2 pl-3"
                      >
                        {group.items.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="flex min-h-11 items-center text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                            activeProps={{ className: "text-foreground" }}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ))}

              <Link
                to="/how-it-works"
                className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                How it works
              </Link>
              <Link
                to="/submit"
                className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-foreground/70 transition-colors duration-200 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                Submit project
              </Link>
              {isAuthenticated ? (
                <>
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
