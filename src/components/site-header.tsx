import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { myProfileQuery } from "@/lib/db";
import { useStoredImage } from "@/lib/media";
import { initialsOf } from "@/lib/display";

const NAV = [
  { to: "/projects", label: "Projects" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/forum", label: "Forums" },
  { to: "/hall-of-fame", label: "Hall of Fame" },
  { to: "/how-it-works", label: "How it works" },
] as const;

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
  const avatar = useStoredImage("avatars", profile?.avatar_url);

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
    <span
      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-mono text-[10px] font-semibold text-ink"
      style={{ background: profile?.accent_color ?? "var(--neon)" }}
      aria-hidden
    >
      {avatar ? (
        <img src={avatar} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(profile?.display_name ?? "You")
      )}
    </span>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="group flex shrink-0 items-center" aria-label="Leaderboard home">
          <img
            src={logo}
            alt="Leaderboard"
            width={210}
            height={67}
            className="h-5 w-auto transition-opacity duration-200 group-hover:opacity-80 sm:h-6"
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative py-1 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              activeProps={{
                className:
                  "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-6">
          <Link
            to="/submit"
            className="hidden rounded-full border border-border px-4 py-2 text-[13px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-neon hover:bg-muted/60 sm:inline-flex"
          >
            Submit project
          </Link>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 text-[13px] transition-colors duration-200 hover:border-border md:inline-flex"
            >
              {monogram}
              <span className="max-w-[9rem] truncate">
                {profile?.display_name ?? "Dashboard"}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 md:inline-flex"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-11 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-200 hover:border-neon md:hidden"
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
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  activeProps={{ className: "text-foreground" }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/submit"
                className="flex min-h-12 items-center border-b border-border/70 text-[14px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                Submit project
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex min-h-12 items-center gap-3 border-b border-border/70 text-[14px]"
                    activeProps={{ className: "text-foreground" }}
                  >
                    {monogram}
                    <span className="truncate">{profile?.display_name ?? "Dashboard"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex min-h-12 items-center gap-2 text-left text-[14px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
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
