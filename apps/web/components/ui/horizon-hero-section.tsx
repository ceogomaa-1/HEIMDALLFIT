"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

gsap.registerPlugin(ScrollTrigger);

type ThreeState = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  composer: EffectComposer | null;
  stars: THREE.Points[];
  mountains: THREE.Mesh[];
  animationId: number | null;
  targetCameraY: number;
  targetCameraZ: number;
};

const portalCards = [
  {
    href: "/coach",
    title: "Coach Portal",
    subtitle: "Operations, analytics, clients, store",
    description:
      "Open the command side of HEIMDALLFIT with a dedicated business dashboard for your coaching brand and workflow.",
    icon: ShieldCheck,
    image: "/branding/heimdallstorm.jpeg"
  },
  {
    href: "/client",
    title: "Client Portal",
    subtitle: "Athlete experience, separate route",
    description:
      "Enter the athlete-facing side of the platform through its own route and experience, separate from coach operations.",
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
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -10, scale: 1.02 }}>
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,17,31,0.32),transparent_30%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="relative flex items-center justify-between">
          <div className="inline-flex rounded-2xl border border-white/10 bg-[#2a0f13]/80 p-3 text-red-200">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
            Portal
          </span>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
          <Image
            src={image}
            alt={title}
            width={960}
            height={600}
            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        <div className="relative mt-5">
          <p className="text-xs uppercase tracking-[0.35em] text-red-300/80">{subtitle}</p>
          <h3 className="mt-3 text-3xl font-semibold">{title}</h3>
          <p className="mt-4 min-h-[80px] text-base leading-7 text-white/58">{description}</p>
        </div>

        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black transition group-hover:bg-red-200">
          Enter
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}

export function Component() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(1);

  const threeState = useRef<ThreeState>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    mountains: [],
    animationId: null,
    targetCameraY: 26,
    targetCameraZ: 100
  });

  const titleChars = useMemo(() => "HEIMDALLFIT".split(""), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = threeState.current;
    state.scene = new THREE.Scene();
    state.scene.fog = new THREE.FogExp2(0x030303, 0.0016);

    state.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    state.camera.position.set(0, 26, 100);

    state.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 0.6;

    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(new RenderPass(state.scene, state.camera));
    state.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.45, 0.9));

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3200;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i += 1) {
      const radius = 160 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const tint = new THREE.Color(i % 7 === 0 ? "#7a1f2d" : "#f4d9dd");
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    state.scene.add(stars);
    state.stars = [stars];

    const mountainPalette = ["#0f0f11", "#171214", "#220d12", "#2d0d14"];
    mountainPalette.forEach((color, index) => {
      const shape = new THREE.Shape();
      shape.moveTo(-900, -240);
      for (let i = 0; i <= 12; i += 1) {
        const x = -900 + i * 150;
        const y = -150 + Math.sin(i * 0.6 + index) * (42 + index * 16) + Math.random() * 16;
        shape.lineTo(x, y);
      }
      shape.lineTo(900, -240);
      shape.closePath();

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9 - index * 0.12
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -50 - index * 55;
      mesh.position.y = -10 + index * 8;
      state.scene?.add(mesh);
      state.mountains.push(mesh);
    });

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(520, 32, 32),
      new THREE.MeshBasicMaterial({
        color: "#6f1625",
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
      })
    );
    state.scene.add(atmosphere);

    const onResize = () => {
      if (!state.camera || !state.renderer || !state.composer) return;
      state.camera.aspect = window.innerWidth / window.innerHeight;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(window.innerWidth, window.innerHeight);
      state.composer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      const elapsed = performance.now() * 0.00018;
      if (state.camera) {
        state.camera.position.y += (state.targetCameraY - state.camera.position.y) * 0.05;
        state.camera.position.z += (state.targetCameraZ - state.camera.position.z) * 0.05;
        state.camera.position.x = Math.sin(elapsed * 3.8) * 1.5;
        state.camera.lookAt(0, 0, -240);
      }

      state.stars.forEach((field, index) => {
        field.rotation.y += 0.00035 + index * 0.00005;
      });

      state.mountains.forEach((mountain, index) => {
        mountain.position.x = Math.sin(elapsed * (1.8 + index * 0.35)) * (8 + index * 5);
      });

      state.composer?.render();
      state.animationId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", onResize);
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      if (state.animationId) cancelAnimationFrame(state.animationId);
      state.stars.forEach((field) => {
        field.geometry.dispose();
        (field.material as THREE.Material).dispose();
      });
      state.mountains.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      state.renderer?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    gsap.set([menuRef.current, titleRef.current, subtitleRef.current, progressRef.current, logoRef.current], {
      visibility: "visible"
    });

    const ctx = gsap.context(() => {
      gsap.from(menuRef.current, {
        x: -50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out"
      });

      gsap.from(".hero-title-char", {
        y: 120,
        opacity: 0,
        stagger: 0.05,
        duration: 1.2,
        ease: "power4.out",
        delay: 0.15
      });

      gsap.from(subtitleRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.45
      });

      gsap.from(logoRef.current, {
        scale: 0.82,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        delay: 0.22
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      setScrollProgress(progress);
      setCurrentSection(progress > 0.4 ? 2 : 1);
      threeState.current.targetCameraY = 26 + progress * 18;
      threeState.current.targetCameraZ = 100 - progress * 80;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-black text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,15,32,0.22),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.82))]" />

      <div
        ref={menuRef}
        style={{ visibility: "hidden" }}
        className="fixed left-5 top-6 z-20 hidden items-center gap-4 rounded-full border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-2xl md:flex"
      >
        <div className="space-y-1">
          <span className="block h-0.5 w-5 bg-white/85" />
          <span className="block h-0.5 w-5 bg-white/55" />
          <span className="block h-0.5 w-5 bg-white/30" />
        </div>
        <span className="text-xs uppercase tracking-[0.45em] text-white/55">Portal</span>
      </div>

      <div
        ref={progressRef}
        style={{ visibility: "hidden" }}
        className="fixed bottom-6 left-1/2 z-20 hidden w-[320px] -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-2xl md:block"
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.34em] text-white/50">
          <span>Scroll</span>
          <span>
            {String(currentSection).padStart(2, "0")} / 02
          </span>
        </div>
        <div className="mt-3 h-1 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#8b1e2d]" style={{ width: `${scrollProgress * 100}%` }} />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-10 md:px-8">
        <section className="flex min-h-[88vh] flex-col justify-center">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-4xl">
              <p className="mb-5 text-xs uppercase tracking-[0.55em] text-red-300/80">HEIMDALLFIT Web Platform</p>
              <h1 ref={titleRef} style={{ visibility: "hidden" }} className="text-[52px] font-semibold leading-[0.95] md:text-[92px]">
                {titleChars.map((char, index) => (
                  <span key={`${char}-${index}`} className="hero-title-char inline-block">
                    {char}
                  </span>
                ))}
              </h1>
              <div ref={subtitleRef} style={{ visibility: "hidden" }} className="mt-6 max-w-2xl text-base leading-8 text-white/58 md:text-lg">
                <p>Two distinct portals. One premium system.</p>
                <p>Built for coaches and clients through a darker, sharper front door.</p>
              </div>
            </div>

            <div ref={logoRef} style={{ visibility: "hidden" }} className="relative flex justify-center lg:justify-end">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,30,45,0.34),transparent_58%)] blur-3xl" />
              <Image
                src="/branding/heimdallfit-logo.png"
                alt="HEIMDALLFIT logo"
                width={430}
                height={430}
                className="relative h-[240px] w-[240px] object-contain drop-shadow-[0_0_55px_rgba(109,17,31,0.28)] md:h-[320px] md:w-[320px]"
              />
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-[-70px] grid gap-6 md:grid-cols-2">
          {portalCards.map((card) => (
            <PortalCard key={card.title} {...card} />
          ))}
        </section>
      </div>
    </div>
  );
}
