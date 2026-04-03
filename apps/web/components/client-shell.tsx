import {
  Bell,
  Compass,
  LayoutGrid,
  MessageCircleMore,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  UserCircle2
} from "lucide-react";
import type { PropsWithChildren } from "react";

const clientNav = [
  { href: "/client", label: "Dashboard", icon: LayoutGrid },
  { href: "/client/messages", label: "Messages", icon: MessageCircleMore },
  { href: "/client#programs", label: "Programs", icon: Sparkles },
  { href: "/client/find-coach", label: "Find your coach", icon: Compass },
  { href: "/client#profile", label: "My Profile", icon: UserCircle2 }
] as const;

export function ClientShell({
  profile,
  children
}: PropsWithChildren<{ profile: { name: string; handle?: string; role: string; avatar: string | null } }>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090d] text-white">
      <div className="absolute inset-0 -z-[1] bg-[radial-gradient(circle_at_top,rgba(110,18,18,0.08),transparent_18%),linear-gradient(180deg,#09090d,#0b0b10)]" />

      <div className="mx-auto flex h-screen w-full max-w-[1460px] px-5 py-8">
        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="flex h-full flex-col rounded-[26px] border border-[#232329] bg-[#121218] px-5 py-6 shadow-[0_35px_90px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 rounded-[18px] border border-[#2a2a31] bg-[#17171d] px-3 py-3">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                  {profile.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() || "")
                    .join("")}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
                <p className="truncate text-xs text-white/45">{profile.handle || profile.role}</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="px-1 text-[10px] uppercase tracking-[0.32em] text-white/28">Client Menu</p>
              <nav className="mt-4 space-y-2">
                {clientNav.map(({ href, label, icon: Icon }, index) => (
                  <a
                    key={label}
                    href={href}
                    className={`group flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-[13px] transition ${
                      index === 0
                        ? "bg-[#212129] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                        : "text-white/54 hover:bg-[#17171d] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{label}</span>
                  </a>
                ))}
              </nav>
            </div>

            <a href="/client/find-coach" className="mt-auto block rounded-[24px] border border-[#282830] bg-[#15151b] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/28">Need a Coach?</p>
                  <h3 className="mt-2 text-base font-semibold leading-tight">Find your coach</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17171d] text-white">
                  <Compass className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-6 text-white/48">Explore coach profiles, room brands, and find the right fit for your training.</p>
            </a>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-5">
          <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-[#232329] bg-[#101016] shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
            <header className="flex items-center justify-end gap-4 border-b border-[#232329] px-5 py-4">
              <div className="flex items-center gap-2">
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a31] bg-[#17171d] text-white/58">
                  <Search className="h-4 w-4" />
                </button>
                <a
                  href="/client/messages"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a31] bg-[#17171d] text-white/58"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#4ade80]" />
                </a>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a31] bg-[#17171d] text-white/58">
                  <Bell className="h-4 w-4" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a31] bg-[#17171d] text-white/58">
                  <Moon className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <main className="flex min-h-full flex-col">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
