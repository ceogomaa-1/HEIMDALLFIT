import { useRef } from "react";

export function useTilt(intensity = 6) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${y * -intensity}deg) translateY(-3px)`;
    ref.current.style.transition = "transform 0.1s ease";
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)";
    ref.current.style.transition = "transform 0.5s cubic-bezier(0.22,1,0.36,1)";
  };

  return { ref, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
