"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Chrome } from "lucide-react";
import * as THREE from "three";
import { cn } from "../../lib/utils";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

type SignInPageProps = {
  className?: string;
  portalType?: "coach" | "client";
};

function ShaderMaterial({
  source,
  uniforms
}: {
  source: string;
  uniforms: Uniforms;
}) {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const material = ref.current.material as THREE.ShaderMaterial;
    material.uniforms.u_time.value = clock.getElapsedTime();
    material.uniforms.u_resolution.value = new THREE.Vector2(size.width * 2, size.height * 2);
  });

  const material = useMemo(() => {
    const preparedUniforms: Record<string, { value: unknown }> = {};

    for (const uniformName in uniforms) {
      const uniform = uniforms[uniformName];
      switch (uniform.type) {
        case "uniform1f":
        case "uniform1i":
        case "uniform1fv":
          preparedUniforms[uniformName] = { value: uniform.value };
          break;
        case "uniform3fv":
          preparedUniforms[uniformName] = {
            value: (uniform.value as number[][]).map((value) => new THREE.Vector3().fromArray(value))
          };
          break;
        default:
          preparedUniforms[uniformName] = { value: uniform.value };
      }
    }

    preparedUniforms.u_time = { value: 0 };
    preparedUniforms.u_resolution = { value: new THREE.Vector2(size.width * 2, size.height * 2) };

    return new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main() {
          gl_Position = vec4(position, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
      `,
      fragmentShader: source,
      uniforms: preparedUniforms,
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor
    });
  }, [size.height, size.width, source, uniforms]);

  return (
    createElement(
      "mesh",
      { ref },
      createElement("planeGeometry", { args: [2, 2] }),
      createElement("primitive", { attach: "material", object: material })
    )
  );
}

function Shader({ source, uniforms }: { source: string; uniforms: Uniforms }) {
  return (
    <Canvas className="absolute inset-0 h-full w-full">
      <ShaderMaterial source={source} uniforms={uniforms} />
    </Canvas>
  );
}

function DotMatrix({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"]
}: {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}) {
  const uniforms = useMemo(() => {
    let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2) {
      colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    } else if (colors.length === 3) {
      colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    }

    return {
      u_colors: {
        value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]),
        type: "uniform3fv"
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv"
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f"
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f"
      },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i"
      }
    };
  }, [colors, dotSize, opacities, shader, totalSize]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
          return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }

        void main() {
          vec2 st = fragCoord.xy;
          ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
          ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}

          float opacity = step(0.0, st.x) * step(0.0, st.y);
          vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

          float frequency = 5.0;
          float show_offset = random(st2);
          float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
          opacity *= u_opacities[int(rand * 10.0)];
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

          vec3 color = u_colors[int(show_offset * 6.0)];
          float animation_speed_factor = 0.42;
          vec2 center_grid = u_resolution / 2.0 / u_total_size;
          float dist_from_center = distance(center_grid, st2);
          float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
          float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
          float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);
          float current_timing_offset = u_reverse == 1 ? timing_offset_outro : timing_offset_intro;

          if (u_reverse == 1) {
            opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
          } else {
            opacity *= step(current_timing_offset, u_time * animation_speed_factor);
          }

          fragColor = vec4(color, opacity);
          fragColor.rgb *= fragColor.a;
        }
      `}
      uniforms={uniforms}
    />
  );
}

function CanvasRevealEffect({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[130, 0, 0]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) {
  return (
    <div className={cn("relative h-full w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors}
          dotSize={dotSize ?? 3}
          opacities={opacities}
          shader={`${reverse ? "u_reverse_active" : "false"}_; animation_speed_factor_${animationSpeed.toFixed(1)}_;`}
          center={["x", "y"]}
        />
      </div>
      {showGradient ? <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" /> : null}
    </div>
  );
}

function AnimatedNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="group relative inline-block h-5 overflow-hidden text-sm">
      <div className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span className="text-white/60">{children}</span>
        <span className="text-white">{children}</span>
      </div>
    </a>
  );
}

function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed left-1/2 top-6 z-20 w-[calc(100%-2rem)] max-w-[920px] -translate-x-1/2 rounded-full border border-white/[0.08] bg-[rgba(12,12,20,0.76)] px-5 py-3 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,rgba(0,163,255,0.25),rgba(255,255,255,0.03))]" />
          <span className="font-display text-sm font-bold tracking-[0.35em] text-white/90">HEIMDALLFIT</span>
        </div>

        <nav className="hidden items-center gap-6 sm:flex">
          <AnimatedNavLink href="/">Portals</AnimatedNavLink>
          <AnimatedNavLink href="/coach/auth">Coach Access</AnimatedNavLink>
          <AnimatedNavLink href="/client/auth">Client Portal</AnimatedNavLink>
        </nav>

        <button
          className="text-white/70 sm:hidden"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
          aria-label="Toggle navigation"
        >
          {isOpen ? "×" : "≡"}
        </button>
      </div>

      <div className={cn("overflow-hidden transition-all duration-300 sm:hidden", isOpen ? "max-h-40 pt-4 opacity-100" : "max-h-0 opacity-0")}>
        <nav className="flex flex-col items-center gap-3 text-sm">
          <a href="/" className="text-white/65 hover:text-white">Portals</a>
          <a href="/coach/auth" className="text-white/65 hover:text-white">Coach Access</a>
          <a href="/client/auth" className="text-white/65 hover:text-white">Client Portal</a>
        </nav>
      </div>
    </header>
  );
}

export function SignInPage({ className, portalType = "coach" }: SignInPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const initialRoomId = searchParams.get("roomId") || "";
  const [roomId, setRoomId] = useState(initialRoomId);
  const [showRoomIdEntry, setShowRoomIdEntry] = useState(Boolean(initialRoomId));
  const [roomLookupLoading, setRoomLookupLoading] = useState(false);
  const [roomLookupError, setRoomLookupError] = useState<string | null>(null);
  const [roomLookup, setRoomLookup] = useState<{
    coachId: string;
    roomId: string;
    roomName: string;
    brandTagline: string;
    brandName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
  } | null>(null);
  const nextPath =
    searchParams.get("next") ||
    (portalType === "client"
      ? inviteToken
        ? `/client?invite=${encodeURIComponent(inviteToken)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ""}`
        : `/client${roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""}`
      : "/coach");
  const supabase = useMemo(() => getSupabaseBrowserClient(portalType), [portalType]);
  const baseAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const [invitePreview, setInvitePreview] = useState<{
    coachName: string;
    coachSpecialty: string;
    roomCode: string;
    roomName: string;
    clientName: string;
    clientEmail: string;
  } | null>(null);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

  const buildCallbackUrl = () =>
    baseAppUrl
      ? `${baseAppUrl}/auth/callback?next=${encodeURIComponent(nextPath)}&portal=${encodeURIComponent(portalType)}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ""}`
      : undefined;

  const ensurePortalRole = async (userId: string) => {
    if (!supabase) return;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    const expectedRole = portalType;
    const role = (profile as { role?: string } | null)?.role;

    if (role && role !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error(
        expectedRole === "coach"
          ? "This account is a client account. Please use the client portal instead."
          : "This account is a coach account. Please use the coach portal instead."
      );
    }
  };

  useEffect(() => {
    let active = true;
    const loadInvite = async () => {
      if (portalType !== "client" || !inviteToken) return;
      try {
        const response = await fetch(`/api/client/invite?token=${encodeURIComponent(inviteToken)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load invite.");
        }
        if (!active) return;
        setInvitePreview(payload.invite);
        if (payload.invite.clientEmail) setEmail(payload.invite.clientEmail);
        if (payload.invite.clientName) setFullName(payload.invite.clientName);
      } catch (inviteError) {
        if (!active) return;
        setError(inviteError instanceof Error ? inviteError.message : "Unable to load invite.");
      }
    };
    loadInvite();
    return () => {
      active = false;
    };
  }, [inviteToken, portalType]);

  useEffect(() => {
    let active = true;

    const loadRoomLookup = async () => {
      if (portalType !== "client" || !roomId.trim()) {
        setRoomLookup(null);
        setRoomLookupError(null);
        return;
      }

      setRoomLookupLoading(true);
      setRoomLookupError(null);

      try {
        const response = await fetch("/api/room-lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ roomId })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to find this room.");
        }
        if (!active) return;
        setRoomLookup(payload.room);
      } catch (lookupError) {
        if (!active) return;
        setRoomLookup(null);
        setRoomLookupError(lookupError instanceof Error ? lookupError.message : "Unable to find this room.");
      } finally {
        if (active) setRoomLookupLoading(false);
      }
    };

    const timeout = setTimeout(loadRoomLookup, roomId.trim() ? 260 : 0);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [portalType, roomId]);

  const acceptInviteIfNeeded = async () => {
    if (portalType !== "client" || !inviteToken || !supabase) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch("/api/client/invite/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ inviteToken })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to connect this invite to the client account.");
    }
  };

  const joinRoomIfNeeded = async () => {
    if (portalType !== "client" || !roomId.trim() || !supabase) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch("/api/client/join-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ roomId })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to connect this room to the client account.");
    }
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        let shouldRedirect = true;
        Promise.resolve()
          .then(() => ensurePortalRole(data.session!.user.id))
          .then(() => acceptInviteIfNeeded())
          .then(() => joinRoomIfNeeded())
          .catch((sessionError) => {
            shouldRedirect = false;
            setError(sessionError instanceof Error ? sessionError.message : "Unable to finish onboarding.");
          })
          .finally(() => {
            if (shouldRedirect) {
              router.replace(nextPath as never);
            }
          });
      }
    });
  }, [nextPath, router, supabase, inviteToken, roomId]);

  const triggerSuccessTransition = () => {
    setReverseCanvasVisible(true);
    setTimeout(() => setInitialCanvasVisible(false), 50);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase is not configured yet. Add your environment keys first.");
      return;
    }

    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildCallbackUrl(),
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase is not configured yet. Add your environment keys first.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Unable to resolve the signed-in account.");
        }

        await ensurePortalRole(user.id);
        await acceptInviteIfNeeded();
        await joinRoomIfNeeded();
        triggerSuccessTransition();
        setMessage(portalType === "client" ? "Access granted. Loading your client portal..." : "Access granted. Loading your coach dashboard...");
        setTimeout(() => router.replace(nextPath as never), 1200);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: portalType
          },
          emailRedirectTo: buildCallbackUrl()
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      triggerSuccessTransition();

      if (data.session) {
        await ensurePortalRole(data.session.user.id);
        await acceptInviteIfNeeded();
        await joinRoomIfNeeded();
        setMessage(
          portalType === "client"
            ? "Client account created. Sending you into your portal..."
            : "Coach account created. Sending you into the dashboard..."
        );
        setTimeout(() => router.replace(nextPath as never), 1200);
      } else {
        setMessage(
          portalType === "client"
            ? "Client account created. Check your email to confirm your access."
            : "Coach account created. Check your email to confirm your access."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("relative flex min-h-screen w-full flex-col overflow-hidden bg-[var(--bg-void)]", className)}>
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible ? (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-[var(--bg-void)]"
              colors={[[255, 255, 255], [0, 163, 255]]}
              dotSize={6}
              reverse={false}
            />
          </div>
        ) : null}

        {reverseCanvasVisible ? (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={4}
              containerClassName="bg-[var(--bg-void)]"
              colors={[[255, 255, 255], [0, 163, 255]]}
              dotSize={6}
              reverse={true}
            />
          </div>
        ) : null}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,163,255,0.14),transparent_36%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_100%,rgba(67,208,127,0.08),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.56),rgba(0,0,0,0.88))]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <MiniNavbar />

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-28">
          <div className="w-full max-w-[1080px] lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="hidden lg:flex lg:flex-col lg:justify-center">
              <div className="max-w-[540px]">
                <p className="font-mono text-xs uppercase tracking-[0.45em] text-[var(--accent)]">
                  {portalType === "client" ? "Client Authentication" : "Coach Authentication"}
                </p>
                <h1 className="mt-5 font-display text-6xl font-bold leading-[0.95] tracking-[-0.06em] text-white">
                  Access
                  <br />
                  Your Portal.
                </h1>
                <p className="mt-6 max-w-[420px] text-lg leading-8 text-[var(--text-secondary)]">
                  {portalType === "client"
                    ? "Sign in or create your client account before entering your coach room."
                    : "Sign in or create your coach account before entering the Command Center."}
                </p>
                <div className="mt-10 grid grid-cols-2 gap-4">
                  {(portalType === "client" ? ["Coach Invite", "Messages", "Programs", "Room Access"] : ["Clients", "Programs", "Store", "Analytics"]).map((item) => (
                    <div key={item} className="rounded-[24px] border border-white/[0.08] bg-[rgba(255,255,255,0.03)] px-5 py-4 backdrop-blur-md shadow-[var(--shadow-card)]">
                      <p className="font-mono text-sm uppercase tracking-[0.28em] text-[var(--text-ghost)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-md items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative w-full overflow-hidden rounded-[28px] border border-white/[0.09] bg-[rgba(12,12,20,0.90)] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[28px] md:p-9"
                >
                  <div className="pointer-events-none absolute left-[15%] right-[15%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,163,255,0.5),transparent)]" />
                  <div className="flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className={cn(
                        "w-1/2 rounded-full px-4 py-2.5 transition",
                        mode === "login" ? "bg-[linear-gradient(135deg,var(--accent),rgba(0,120,220,1))] text-white shadow-[0_8px_24px_rgba(0,163,255,0.28)]" : "text-white/55 hover:text-white"
                      )}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={cn(
                        "w-1/2 rounded-full px-4 py-2.5 transition",
                        mode === "signup" ? "bg-[linear-gradient(135deg,var(--accent),rgba(0,120,220,1))] text-white shadow-[0_8px_24px_rgba(0,163,255,0.28)]" : "text-white/55 hover:text-white"
                      )}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="mt-8 space-y-2 text-center">
                    <h2 className="font-display text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-white">
                      {mode === "login"
                        ? portalType === "client"
                          ? "Welcome to your room."
                          : "Welcome back, coach."
                        : portalType === "client"
                          ? "Create your client access."
                          : "Create your coach access."}
                    </h2>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                      {mode === "login"
                        ? portalType === "client"
                          ? "Log in to unlock your dashboard, room, and coach communication."
                          : "Log in to unlock your Command Center."
                        : portalType === "client"
                          ? "Sign up to enter your coach room and complete onboarding."
                          : "Sign up to start managing clients, offers, and onboarding."}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-white transition hover:-translate-y-px hover:border-white/[0.14] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Chrome className="h-4 w-4" />
                      <span>
                        {portalType === "client" ? "Continue with Google" : "Sign in with Google"}
                      </span>
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="font-mono text-xs uppercase tracking-[0.28em] text-white/30">or</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  </div>

                  {portalType === "client" && invitePreview ? (
                    <div className="mt-6 rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(0,163,255,0.08),rgba(255,255,255,0.03))] p-4 text-left">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Coach Invite</p>
                      <div className="mt-3">
                        <p className="text-lg font-semibold text-white">{invitePreview.coachName}</p>
                        <p className="mt-1 text-sm text-white/52">{invitePreview.coachSpecialty || "Your coach is waiting for you."}</p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">Room Code</p>
                          <p className="mt-1 text-sm font-semibold text-white">{invitePreview.roomCode}</p>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">Room Name</p>
                          <p className="mt-1 text-sm font-semibold text-white">{invitePreview.roomName}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {portalType === "client" ? (
                    <div className="mt-4 text-left">
                      <button
                        type="button"
                        onClick={() => setShowRoomIdEntry((current) => !current)}
                        className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-white"
                      >
                        Got your coach room ID already?
                      </button>

                      {showRoomIdEntry ? (
                        <div className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                          <label className="block text-[11px] uppercase tracking-[0.24em] text-[var(--text-ghost)]">Coach Room ID</label>
                          <input
                            value={roomId}
                            onChange={(event) => setRoomId(event.target.value.toUpperCase())}
                            placeholder="MK7WAU2Y"
                            className="mt-3 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3 font-mono tracking-[0.28em] text-white outline-none transition placeholder:text-white/28"
                          />
                          {roomLookupLoading ? <p className="mt-3 text-xs text-white/45">Checking room...</p> : null}
                          {roomLookupError ? <p className="mt-3 text-xs text-red-300">{roomLookupError}</p> : null}
                          {roomLookup ? (
                            <div className="mt-3 rounded-[18px] border border-[rgba(0,163,255,0.18)] bg-[rgba(0,163,255,0.08)] p-4">
                              <p className="text-sm font-semibold text-white">{roomLookup.brandName}</p>
                              <p className="mt-1 text-xs text-white/45">{roomLookup.roomName}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">Room ready to join</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    {mode === "signup" ? (
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder={portalType === "client" ? "Client full name" : "Coach full name"}
                        className="w-full rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-white outline-none transition placeholder:text-white/28 focus:border-white/25"
                        required
                      />
                    ) : null}

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                        placeholder={portalType === "client" ? "client@email.com" : "coach@email.com"}
                      className="w-full rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-white outline-none transition placeholder:text-white/28 focus:border-white/25"
                      required
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      className="w-full rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-white outline-none transition placeholder:text-white/28 focus:border-white/25"
                      required
                    />

                    {mode === "signup" ? (
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                        className="w-full rounded-[14px] border border-white/[0.09] bg-white/[0.04] px-5 py-3.5 text-white outline-none transition placeholder:text-white/28 focus:border-white/25"
                        required
                      />
                    ) : null}

                    {error ? <p className="text-sm text-red-300">{error}</p> : null}
                    {message ? <p className="text-sm text-white/70">{message}</p> : null}
                    {!isSupabaseConfigured ? (
                      <p className="text-xs text-amber-200/85">
                        Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable live authentication.
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-2 w-full rounded-[14px] bg-[linear-gradient(135deg,var(--accent)_0%,rgba(0,120,220,1)_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(0,163,255,0.40)] transition hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,163,255,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading
                        ? "Processing..."
                        : mode === "login"
                          ? portalType === "client"
                            ? "Enter Client Portal"
                            : "Enter Coach Portal"
                          : portalType === "client"
                            ? "Create Client Account"
                            : "Create Coach Account"}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-xs text-white/38">
                    By continuing, you agree to the{" "}
                    <Link href="#" className="underline transition hover:text-white/65">
                      Terms
                    </Link>
                    {" "}and{" "}
                    <Link href="#" className="underline transition hover:text-white/65">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
