"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    THREE: any;
  }
}

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: any;
    scene: any;
    renderer: any;
    uniforms: {
      time: { value: number };
      resolution: { value: { x: number; y: number } };
    } | null;
    animationId: number | null;
    resizeHandler: (() => void) | null;
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    resizeHandler: null
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js";
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS();
      }
    };
    document.head.appendChild(script);

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (sceneRef.current.resizeHandler) {
        window.removeEventListener("resize", sceneRef.current.resizeHandler);
      }
      sceneRef.current.renderer?.dispose();
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return;

    const THREE = window.THREE;
    const container = containerRef.current;
    container.innerHTML = "";

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneBufferGeometry(2, 2);
    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() }
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      float random(in float x) {
        return fract(sin(x) * 1e4);
      }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        vec2 mosaic = vec2(4.0, 2.0);
        vec2 screenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * screenSize.x / mosaic.x) / (screenSize.x / mosaic.x);
        uv.y = floor(uv.y * screenSize.y / mosaic.y) / (screenSize.y / mosaic.y);

        float t = time * 0.06 + random(uv.x) * 0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) - length(uv));
          }
        }

        gl_FragColor = vec4(color[2], color[1], color[0], 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };

    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: null,
      resizeHandler: onWindowResize
    };

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };

    animate();
  };

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

const portalCards = [
  {
    href: "/coach",
    title: "Coach Portal",
    subtitle: "Invite, manage, and scale your business",
    description: "Open the coach side of HEIMDALLFIT for clients, onboarding, analytics, plans, and store operations.",
    icon: ShieldCheck,
    image: "/branding/heimdallstorm.jpeg"
  },
  {
    href: "/client",
    title: "Client Portal",
    subtitle: "Separate athlete-facing entry",
    description: "Enter the client side through its own route, with a dedicated experience separate from coach operations.",
    icon: UsersRound,
    image: "/branding/heimdallfit-logo.png"
  }
] as const;

function PortalCard({
  href,
  title,
  subtitle,
  description,
  image,
  icon: Icon
}: (typeof portalCards)[number]) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -8, scale: 1.015 }}
    >
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(118,18,34,0.28),transparent_28%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="relative flex items-center justify-between">
          <div className="inline-flex rounded-2xl border border-white/10 bg-[#2a1115] p-3 text-red-200">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
            Portal
          </span>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/40">
          <Image
            src={image}
            alt={title}
            width={960}
            height={600}
            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        </div>

        <div className="relative mt-5">
          <p className="text-xs uppercase tracking-[0.34em] text-red-300/80">{subtitle}</p>
          <h3 className="mt-3 text-3xl font-semibold">{title}</h3>
          <p className="mt-4 min-h-[80px] text-base leading-7 text-white/58">{description}</p>
        </div>

        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black transition group-hover:bg-red-200">
          Enter Portal
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}

export function HomePortalHero() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <section className="relative flex min-h-screen flex-col items-center px-4 pt-8 md:px-8">
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center">
          <div className="pointer-events-none absolute inset-0">
            <ShaderAnimation />
          </div>

          <div className="relative z-10 flex min-h-screen w-full flex-col items-center">
            <div className="pt-3">
              <Image
                src="/branding/heimdallfit-logo.png"
                alt="HEIMDALLFIT logo"
                width={132}
                height={132}
                className="h-24 w-24 object-contain opacity-95 md:h-28 md:w-28"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <h1 className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">HEIMDALLFIT</h1>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.45em] text-white/55 md:text-base">
                Invite, Manage, Win.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-black px-4 pb-16 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-2">
          {portalCards.map((card) => (
            <PortalCard key={card.title} {...card} />
          ))}
        </div>
      </section>
    </main>
  );
}
