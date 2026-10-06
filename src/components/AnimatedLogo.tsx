import Image from "next/image";
import type { CSSProperties } from "react";

// Слои логотипа из scripts/build-splash-layers.mjs (координаты в пикселях исходника 832×1248, кладём в процентах).
const SRC_W = 832;
const SRC_H = 1248;
const LAYERS = [
  { name: "l1", left: 0, top: 717, width: 832, height: 120, kind: "line", delay: 2.7 },
  { name: "l2", left: 0, top: 831, width: 832, height: 74, kind: "rule", delay: 2.9 },
  { name: "l3", left: 0, top: 902, width: 832, height: 99, kind: "line", delay: 3.05 },
  { name: "l4", left: 0, top: 1007, width: 832, height: 72, kind: "line", delay: 3.25 },
  { name: "l5", left: 0, top: 1080, width: 832, height: 84, kind: "rule", delay: 3.45 },
] as const;
const EMBLEM = { left: 166, top: 97, width: 501, height: 598 };

function box(l: { left: number; top: number; width: number; height: number }): CSSProperties {
  return {
    left: `${(l.left / SRC_W) * 100}%`,
    top: `${(l.top / SRC_H) * 100}%`,
    width: `${(l.width / SRC_W) * 100}%`,
    height: `${(l.height / SRC_H) * 100}%`,
  };
}

/**
 * Логотип магазина, который «оживает»: буква M выезжает вперёд и откатывается назад, вокруг неё крутится кольцо-лента,
 * помада поднимается, к концу всё встаёт на место, проходит блик и выезжают надписи.
 */
export function AnimatedLogo() {
  return (
    <div className="logo-stage relative" style={{ aspectRatio: `${SRC_W} / ${SRC_H}`, width: "min(78vw, 52dvh)" }} aria-hidden>
      <span className="logo-glow absolute rounded-full" style={{ ...box({ left: 120, top: 50, width: 600, height: 690 }) }} />
      <div className="logo-emblem absolute" style={box(EMBLEM)}>
        {/* Части эмблемы лежат друг на друге без смещения; у каждой своё движение (globals.css, logo-*). */}
        <Image src="/brand/splash/emblem-petals.webp" alt="" width={EMBLEM.width} height={EMBLEM.height} priority className="logo-petals absolute inset-0 h-full w-full" />
        <Image src="/brand/splash/emblem-ring.webp" alt="" width={EMBLEM.width} height={EMBLEM.height} priority className="logo-ring absolute inset-0 h-full w-full" />
        <Image src="/brand/splash/emblem-lipstick.webp" alt="" width={EMBLEM.width} height={EMBLEM.height} priority className="logo-lipstick absolute inset-0 h-full w-full" />
        <Image src="/brand/splash/emblem-m.webp" alt="" width={EMBLEM.width} height={EMBLEM.height} priority className="logo-m absolute inset-0 h-full w-full" />
        <span className="logo-shine absolute inset-0" style={{ maskImage: "url(/brand/splash/emblem.webp)", WebkitMaskImage: "url(/brand/splash/emblem.webp)", maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
      </div>
      {LAYERS.map((l) => (
        <Image
          key={l.name}
          src={`/brand/splash/${l.name}.webp`}
          alt=""
          width={l.width}
          height={l.height}
          priority
          className={`absolute ${l.kind === "rule" ? "logo-rule" : "logo-line"}`}
          style={{ ...box(l), animationDelay: `${l.delay}s` }}
        />
      ))}
    </div>
  );
}
