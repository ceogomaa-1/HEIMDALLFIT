import {
  Bell,
  CirclePlus,
  Cog,
  MessageCircleMore,
  Moon,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserCircle2,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropsWithChildren } from "react";

const coachNav = [
  { href: "/coach", label: "Clients", icon: Users },
  { href: "/coach/messages", label: "Messages", icon: MessageCircleMore },
  { href: "/coach#store", label: "My Store", icon: ShoppingBag },
  { href: "/coach/profile", label: "My Profile", icon: UserCircle2 },
  { href: "/coach/builder", label: "Plan & Diet Builder", icon: SlidersHorizontal },
  { href: "/coach/onboarding", label: "Onboarding", icon: Users },
  { href: "/coach#settings", label: "Settings", icon: Cog }
] as const;

function SidebarLink({
  href,
  label,
  icon: Icon,
  active = false
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] transition-all duration-200 ${
        active
          ? "border border-[#0b4563] bg-[rgba(0,163,255,0.08)] text-white shadow-[0_0_0_1px_rgba(0,163,255,0.12),0_12px_30px_rgba(0,0,0,0.22)]"
          : "border border-transparent text-[var(--text-muted)] hover:border-white/10 hover:bg-white/[0.04] hover:text-[var(--text-secondary)]"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm bg-[var(--accent)] shadow-[0_0_8px_rgba(0,163,255,0.5)]" />
      ) : null}
      <Icon className={`h-4 w-4 transition-colors ${active ? "text-[var(--accent)]" : "group-hover:text-[var(--accent)]"}`} />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function CoachShell({
  profile,
  children
}: PropsWithChildren<{ profile: { name: string; handle?: string; role: string; avatar: string | null } }>) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-void)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,163,255,0.08),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(67,208,127,0.05),transparent_28%),linear-gradient(180deg,#09090d_0%,#090a10_35%,#08080d_100%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1760px] px-6 py-8">
        <aside className="hidden w-[260px] shrink-0 animate-slide-left lg:block">
          <div
            style={{
              background: "rgba(10,10,18,0.85)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
              padding: "20px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-40px",
                left: "-40px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,163,255,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
                animation: "orb-drift 8s ease-in-out infinite"
              }}
            />

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "18px",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                position: "relative"
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--green))",
                  padding: "2px",
                  borderRadius: "999px"
                }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="block h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-deep)] font-mono text-sm font-medium text-white">
                    {initials || "C"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{profile.name}</p>
                <p className="truncate text-[12px] text-[var(--text-muted)]">{profile.handle || profile.role}</p>
              </div>
            </div>

            <div className="mb-3 mt-7 px-1 text-[9px] uppercase tracking-[0.38em] text-[var(--text-ghost)]">Main Menu</div>
            <nav className="space-y-2">
              {coachNav.map(({ href, label, icon: Icon }, index) => (
                <SidebarLink key={label} href={href} label={label} icon={Icon} active={index === 0} />
              ))}
            </nav>

            <a
              href="/coach/onboarding"
              className="group relative mt-auto overflow-hidden rounded-[20px] p-4 transition-all duration-300 hover:border-[rgba(0,163,255,0.3)] hover:shadow-[0_0_0_1px_rgba(0,163,255,0.2),0_18px_40px_rgba(0,0,0,0.35)]"
              style={{
                background: "linear-gradient(135deg, rgba(0,163,255,0.10) 0%, rgba(0,163,255,0.04) 100%)",
                border: "1px solid rgba(0,163,255,0.18)"
              }}
            >
              <div className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.12),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-ghost)]">Onboard Client</p>
                  <h3 className="mt-3 max-w-[140px] font-display text-[1.3rem] font-semibold leading-[1.02] text-white">
                    Onboard a new Client
                  </h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
                  <CirclePlus className="h-5 w-5" />
                </div>
              </div>
              <p className="relative mt-4 text-[13px] leading-6 text-[var(--text-secondary)]">
                Start a fresh onboarding flow and send their access instantly.
              </p>
            </a>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-6">
          <div
            style={{
              background: "rgba(10,10,16,0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "28px",
              boxShadow: "var(--shadow-panel)"
            }}
            className="flex min-h-[calc(100vh-64px)] flex-col"
          >
            <header className="flex items-center justify-end gap-2 border-b border-white/5 px-6 py-5">
              {[
                { href: null, icon: Search, pulse: false },
                { href: "/coach/messages", icon: MessageCircleMore, pulse: true },
                { href: null, icon: Bell, pulse: false },
                { href: null, icon: Moon, pulse: false }
              ].map(({ href, icon: Icon, pulse }, index) => {
                const content = (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "var(--text-muted)"
                    }}
                    className="relative transition-all duration-200 hover:scale-105 hover:border-white/12 hover:bg-white/8 hover:text-[var(--text-primary)]"
                  >
                    <Icon className="h-4 w-4" />
                    {pulse ? (
                      <span
                        style={{
                          position: "absolute",
                          top: "7px",
                          right: "7px",
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "var(--green)",
                          boxShadow: "0 0 6px var(--green)",
                          animation: "pulseGlow 2s ease-in-out infinite"
                        }}
                      />
                    ) : null}
                  </span>
                );

                return href ? (
                  <a key={index} href={href}>
                    {content}
                  </a>
                ) : (
                  <button key={index} type="button">
                    {content}
                  </button>
                );
              })}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <main className="portal-page flex min-h-full flex-col">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
