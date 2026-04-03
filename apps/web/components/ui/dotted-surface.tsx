"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type DottedSurfaceProps = React.ComponentProps<"div">;

export function DottedSurface({ className = "", ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    points: THREE.Points;
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const SEPARATION = 130;
    const AMOUNT_X = 36;
    const AMOUNT_Y = 54;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050506, 2400, 10000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 340, 1120);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050506, 0);
    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNT_X; ix += 1) {
      for (let iy = 0; iy < AMOUNT_Y; iy += 1) {
        const x = ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2;
        const z = iy * SEPARATION - (AMOUNT_Y * SEPARATION) / 2;

        positions.push(x, 0, z);
        colors.push(0.65, 0.65, 0.68);
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 7,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const array = positionAttribute.array as Float32Array;
      let i = 0;

      for (let ix = 0; ix < AMOUNT_X; ix += 1) {
        for (let iy = 0; iy < AMOUNT_Y; iy += 1) {
          const index = i * 3;
          array[index + 1] = Math.sin((ix + count) * 0.26) * 36 + Math.sin((iy + count) * 0.42) * 34;
          i += 1;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.08;
      sceneRef.current = { scene, camera, renderer, points, animationId };
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`pointer-events-none fixed inset-0 -z-10 ${className}`.trim()} {...props} />;
}
