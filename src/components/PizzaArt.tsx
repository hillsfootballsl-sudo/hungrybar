"use client";
// Procedural, live-updating pizza illustration. Every topping portion adds real pieces that drop onto the pie.
import { memo, useId, useMemo } from "react";
import type { Catalog } from "@/lib/types";

export interface PizzaArtProps {
  catalog: Pick<Catalog, "toppings" | "sizes" | "crusts">;
  sizeId?: string | null;
  crustId?: string | null;
  toppings: Record<string, number>;
  /** show size difference by scaling the pie */
  scaleBySize?: boolean;
  /** show the wooden board/plate behind */
  board?: boolean;
  /** draw slice cuts */
  sliced?: boolean;
  /** animate pieces dropping in */
  animate?: boolean;
  className?: string;
  steam?: boolean;
}

// ───────── deterministic randomness ─────────
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = 200; // center
const f = (n: number) => Math.round(n * 100) / 100; // stable SSR/CSR numbers
type Shape = "ROUND" | "RECT";

/** Random point inside the pie (round: radius r, rect: half-sizes) */
function pointIn(shape: Shape, r: number, rand: () => number, pad = 0) {
  if (shape === "RECT") {
    const w = r * 1.18 - pad;
    const h = r * 0.86 - pad;
    return { x: f(C + (rand() * 2 - 1) * w), y: f(C + (rand() * 2 - 1) * h) };
  }
  const rr = (r - pad) * Math.sqrt(rand());
  const a = rand() * Math.PI * 2;
  return { x: f(C + Math.cos(a) * rr), y: f(C + Math.sin(a) * rr) };
}

/** Evenly-spread points using a jittered sunflower distribution (looks hand-placed) */
function spreadPoints(shape: Shape, r: number, n: number, seed: number, pad: number) {
  const rand = rng(seed);
  const pts: { x: number; y: number; rot: number; s: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const offset = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    if (shape === "RECT") {
      const p = pointIn(shape, r, rand, pad);
      pts.push({ ...p, rot: f(rand() * 360), s: f(0.85 + rand() * 0.3) });
      continue;
    }
    const rr = (r - pad) * Math.sqrt((i + 0.5) / n) * (0.92 + rand() * 0.08);
    const a = i * golden + offset + (rand() - 0.5) * 0.5;
    pts.push({ x: f(C + Math.cos(a) * rr), y: f(C + Math.sin(a) * rr), rot: f(rand() * 360), s: f(0.85 + rand() * 0.3) });
  }
  return pts;
}

function blobPath(cx: number, cy: number, r: number, seed: number, wobble = 0.18, points = 9) {
  const rand = rng(seed);
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rand() * wobble);
    return [f(cx + Math.cos(a) * rr), f(cy + Math.sin(a) * rr)];
  });
  let d = "";
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

// ───────── topping piece renderers ─────────
function Piece({ visual, seed }: { visual: string; seed: number }) {
  const rand = rng(seed);
  switch (visual) {
    case "pepperoni":
      return (
        <g>
          <circle r={13} fill="#A62417" />
          <circle r={11.5} fill="#C8321F" />
          <circle cx={-4} cy={-3} r={1.8} fill="#F2A08E" opacity={0.8} />
          <circle cx={4} cy={2} r={1.5} fill="#F2A08E" opacity={0.8} />
          <circle cx={-1} cy={5} r={1.3} fill="#F2A08E" opacity={0.7} />
          <circle cx={5} cy={-5} r={1} fill="#7A170D" />
          <ellipse cx={-4} cy={-6} rx={4} ry={1.6} fill="#fff" opacity={0.18} />
        </g>
      );
    case "chicken":
      return (
        <g>
          <path d={blobPath(0, 0, 8.5, seed, 0.5, 6)} fill="#B9531F" />
          <path d={blobPath(-1, -1, 6, seed + 1, 0.5, 6)} fill="#D9772F" />
          <path d="M-5,-1 L4,-3 M-4,3 L5,1" stroke="#7A2E0E" strokeWidth={1.4} strokeLinecap="round" opacity={0.75} />
        </g>
      );
    case "beef":
      return (
        <g>
          {[0, 1, 2].map((k) => (
            <path key={k} d={blobPath((rand() - 0.5) * 9, (rand() - 0.5) * 9, 4 + rand() * 2, seed + k * 7, 0.6, 6)} fill={k === 1 ? "#5B2F1D" : "#6E3B24"} />
          ))}
          <circle cx={1} cy={-1} r={1} fill="#A0664A" />
        </g>
      );
    case "pepper_green":
    case "pepper_red": {
      const col = visual === "pepper_green" ? "#2E8B3A" : "#D7302A";
      const hi = visual === "pepper_green" ? "#6CC25E" : "#FF7A6B";
      return (
        <g>
          <path d="M-11,4 Q0,-10 11,4" fill="none" stroke={col} strokeWidth={5.5} strokeLinecap="round" />
          <path d="M-8,1.5 Q0,-7 8,1.5" fill="none" stroke={hi} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        </g>
      );
    }
    case "capsicum":
      return (
        <g>
          <circle r={8} fill="none" stroke="#9BBE2E" strokeWidth={3.2} />
          <circle r={8} fill="none" stroke="#D3EA6B" strokeWidth={0.9} opacity={0.8} />
          <circle cx={-2} cy={1} r={1.1} fill="#F4F1C5" />
          <circle cx={2} cy={-1.5} r={1.1} fill="#F4F1C5" />
          <circle cx={1} cy={2.5} r={1} fill="#F4F1C5" />
        </g>
      );
    case "onion":
      return (
        <g>
          <path d="M-12,5 Q0,-12 12,5" fill="none" stroke="#9C4F9E" strokeWidth={3.6} strokeLinecap="round" />
          <path d="M-9,5 Q0,-7 9,5" fill="none" stroke="#F0DDF0" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case "paneer":
      return (
        <g>
          <rect x={-6} y={-6} width={12} height={12} rx={2.5} fill="#FBF6E6" stroke="#E2D2A8" strokeWidth={1} />
          <path d="M-4,-2 L4,-4 M-4,3 L4,1" stroke="#C88A43" strokeWidth={1.3} />
        </g>
      );
    case "olive":
      return (
        <g>
          <circle r={5.5} fill="#2A2420" />
          <circle r={2.2} fill="#7A5B3C" />
        </g>
      );
    case "mushroom":
      return (
        <g>
          <path d="M-8,0 A8,7 0 0 1 8,0 Z" fill="#CDB59A" />
          <rect x={-2.5} y={0} width={5} height={7} rx={1.5} fill="#E8DCC8" />
        </g>
      );
    case "jalapeno":
      return (
        <g>
          <circle r={6.5} fill="#3D8F2F" />
          <circle r={4.2} fill="#BFE08A" />
          <circle cx={-1} r={0.9} fill="#F6F3D5" />
          <circle cx={1.5} cy={1} r={0.9} fill="#F6F3D5" />
        </g>
      );
    case "corn":
      return <path d={blobPath(0, 0, 3.2, seed, 0.3, 6)} fill="#F6C836" stroke="#D9A21A" strokeWidth={0.6} />;
    default:
      return <circle r={6} fill="#E9C46A" />;
  }
}

const PIECES_PER_PORTION: Record<string, number> = {
  pepperoni: 9,
  chicken: 11,
  beef: 12,
  pepper_green: 9,
  pepper_red: 9,
  capsicum: 9,
  onion: 9,
  paneer: 10,
  olive: 10,
  mushroom: 9,
  jalapeno: 9,
  corn: 16,
};

function PizzaArtInner({ catalog, sizeId, crustId, toppings, scaleBySize = true, board = true, sliced = false, animate = true, className, steam }: PizzaArtProps) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${uid}`;
  const size = catalog.sizes.find((s) => s.id === sizeId);
  const shape: Shape = size?.shape === "RECT" ? "RECT" : "ROUND";
  const crustIdx = Math.max(0, catalog.crusts.findIndex((c) => c.id === crustId));
  const thin = shape === "ROUND" && /thin/i.test(catalog.crusts[crustIdx]?.name ?? "");
  const hasSize = !!size;

  // scale pie by persons (1P smaller → 4P biggest)
  const roundSizes = catalog.sizes.filter((s) => s.shape !== "RECT");
  const rank = size ? roundSizes.findIndex((s) => s.id === size.id) : roundSizes.length - 1;
  const scale = !scaleBySize || shape === "RECT" || rank < 0 ? 1 : 0.8 + (0.2 * rank) / Math.max(1, roundSizes.length - 1);

  const R = 150 * scale; // outer radius
  const rim = thin ? 9 : 19;
  const inner = R - rim;

  const groups = useMemo(() => {
    const byVisual: { sauce: number; cheese: number; pieces: { id: string; visual: string; portions: number }[] } = { sauce: 0, cheese: 0, pieces: [] };
    for (const t of catalog.toppings) {
      const n = toppings[t.id] ?? 0;
      if (n <= 0) continue;
      if (t.visual === "sauce") byVisual.sauce += n;
      else if (t.visual === "cheese") byVisual.cheese += n;
      else byVisual.pieces.push({ id: t.id, visual: t.visual, portions: n });
    }
    return byVisual;
  }, [catalog.toppings, toppings]);

  const piecesScale = Math.min(1.25, Math.max(0.9, scale * 1.05));
  const sizeFactor = shape === "RECT" ? 1 : 0.75 + 0.45 * ((scale - 0.8) / 0.2);

  // Base outline paths
  const rectW = R * 1.3;
  const rectH = R * 0.98;

  const sauceLevel = groups.sauce;
  const cheeseLevel = groups.cheese;

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Your pizza">
      <defs>
        <radialGradient id={id("pa-crust")} cx="50%" cy="45%" r="60%">
          <stop offset="70%" stopColor="#E9B66B" />
          <stop offset="92%" stopColor="#C98A3E" />
          <stop offset="100%" stopColor="#A86A2A" />
        </radialGradient>
        <radialGradient id={id("pa-dough")} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#F8DDA6" />
          <stop offset="100%" stopColor="#EFC685" />
        </radialGradient>
        <radialGradient id={id("pa-sauce")} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor={sauceLevel >= 2 ? "#D7351E" : "#E04A2C"} />
          <stop offset="100%" stopColor={sauceLevel >= 3 ? "#9E1F10" : "#B8301A"} />
        </radialGradient>
        <radialGradient id={id("pa-board")} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="100%" stopColor="#1E1E1E" />
        </radialGradient>
        <filter id={id("pa-shadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <filter id={id("pa-soft")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <clipPath id={id("pa-inner")}>
          {shape === "RECT" ? (
            <rect x={C - rectW + rim} y={C - rectH + rim} width={(rectW - rim) * 2} height={(rectH - rim) * 2} rx={10} />
          ) : (
            <circle cx={C} cy={C} r={inner} />
          )}
        </clipPath>
      </defs>

      {board && (
        <g>
          {shape === "RECT" ? (
            <rect x={14} y={58} width={372} height={284} rx={18} fill={`url(#${id("pa-board")})`} />
          ) : (
            <>
              <circle cx={C} cy={C} r={192} fill={`url(#${id("pa-board")})`} />
              <circle cx={C} cy={C} r={186} fill="none" stroke="#F8EDD6" strokeOpacity={0.12} strokeWidth={2} strokeDasharray="2 10" />
            </>
          )}
        </g>
      )}

      {!hasSize ? (
        // ghost dough ball before a size is picked
        <g className={animate ? "origin-center animate-floaty" : ""} style={{ transformOrigin: "200px 200px" }}>
          <ellipse cx={C} cy={C + 52} rx={92} ry={16} fill="#000" opacity={0.25} />
          <path d={blobPath(C, C, 86, 42, 0.08, 10)} fill={`url(#${id("pa-dough")})`} />
          <ellipse cx={C - 26} cy={C - 30} rx={30} ry={14} fill="#fff" opacity={0.25} />
          <path d={`M${C - 20},${C + 10} q20,12 40,0`} stroke="#D9A866" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g filter={`url(#${id("pa-shadow")})`} key={`${size?.id}-${thin}`} className={animate ? "animate-drop" : ""} style={{ transformOrigin: "200px 200px" }}>
          {/* crust */}
          {shape === "RECT" ? (
            <>
              <rect x={C - rectW} y={C - rectH} width={rectW * 2} height={rectH * 2} rx={14} fill="#7A4317" />
              <rect x={C - rectW + 4} y={C - rectH + 4} width={rectW * 2 - 8} height={rectH * 2 - 8} rx={12} fill="#B8692A" />
              {/* caramelised cheese frico edge */}
              <rect x={C - rectW + 8} y={C - rectH + 8} width={rectW * 2 - 16} height={rectH * 2 - 16} rx={10} fill="none" stroke="#8C4513" strokeWidth={6} strokeDasharray="14 6 4 8" opacity={0.85} />
              <rect x={C - rectW + rim} y={C - rectH + rim} width={(rectW - rim) * 2} height={(rectH - rim) * 2} rx={10} fill={`url(#${id("pa-dough")})`} />
            </>
          ) : (
            <>
              <circle cx={C} cy={C} r={R} fill={`url(#${id("pa-crust")})`} />
              {!thin &&
                Array.from({ length: 22 }, (_, i) => {
                  const a = (i / 22) * Math.PI * 2 + 0.2;
                  const rr = R - rim / 2 + Math.sin(i * 3.1) * 2;
                  return <circle key={i} cx={f(C + Math.cos(a) * rr)} cy={f(C + Math.sin(a) * rr)} r={1.6 + (i % 3) * 0.7} fill="#8A5220" opacity={0.55} />;
                })}
              {!thin && <circle cx={C} cy={C} r={R - 4} fill="none" stroke="#F6D28F" strokeOpacity={0.45} strokeWidth={3} />}
              <circle cx={C} cy={C} r={inner} fill={`url(#${id("pa-dough")})`} />
            </>
          )}
        </g>
      )}

      {hasSize && (
        <g clipPath={`url(#${id("pa-inner")})`}>
          {/* sauce */}
          {sauceLevel > 0 && (
            <g key={`sauce-${sauceLevel}`} className={animate ? "animate-drop" : ""} style={{ transformOrigin: "200px 200px" }}>
              {shape === "RECT" ? (
                <rect x={C - rectW + rim + 6} y={C - rectH + rim + 6} width={(rectW - rim - 6) * 2} height={(rectH - rim - 6) * 2} rx={14} fill={`url(#${id("pa-sauce")})`} opacity={0.75 + 0.1 * Math.min(3, sauceLevel)} />
              ) : (
                <path d={blobPath(C, C, inner * (sauceLevel === 1 ? 0.86 : sauceLevel === 2 ? 0.95 : 1.02), 11, 0.06, 14)} fill={`url(#${id("pa-sauce")})`} opacity={0.8 + 0.07 * Math.min(3, sauceLevel)} />
              )}
              {sauceLevel >= 2 &&
                spreadPoints(shape, inner * 0.8, 5 + sauceLevel * 3, 99, 6).map((p, i) => (
                  <ellipse key={i} cx={p.x} cy={p.y} rx={6} ry={2.4} fill="#FF8A70" opacity={0.25} transform={`rotate(${p.rot} ${p.x} ${p.y})`} />
                ))}
            </g>
          )}

          {/* cheese */}
          {cheeseLevel > 0 && (
            <g key={`cheese-${cheeseLevel}`}>
              {cheeseLevel >= 2 && shape === "ROUND" && (
                <path
                  d={blobPath(C, C, inner * 0.94, 23, 0.1, 16)}
                  fill="#FBE29A"
                  opacity={0.55}
                  filter={`url(#${id("pa-soft")})`}
                  className={animate ? "animate-drop" : ""}
                  style={{ transformOrigin: "200px 200px" }}
                />
              )}
              {cheeseLevel >= 2 && shape === "RECT" && (
                <rect x={C - rectW + rim + 4} y={C - rectH + rim + 4} width={(rectW - rim - 4) * 2} height={(rectH - rim - 4) * 2} rx={12} fill="#FBE29A" opacity={0.6} />
              )}
              {spreadPoints(shape, inner * 0.97, Math.round((18 + cheeseLevel * 12) * sizeFactor), 777, 4).map((p, i) => (
                <path
                  key={i}
                  d={blobPath(p.x, p.y, (10 + (i % 4) * 3) * p.s * (cheeseLevel >= 3 ? 1.25 : 1), 300 + i, 0.4, 7)}
                  fill={i % 5 === 0 ? "#FFF3C4" : "#FCE7A2"}
                  stroke="#EFC45F"
                  strokeWidth={0.8}
                  opacity={0.96}
                  className={animate ? "animate-drop" : ""}
                  style={{ animationDelay: `${(i % 12) * 18}ms`, transformOrigin: `${p.x}px ${p.y}px` }}
                />
              ))}
              {cheeseLevel >= 3 &&
                spreadPoints(shape, inner * 0.85, 14, 501, 8).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5 + (i % 3)} fill="#D39A3A" opacity={0.55} />)}
            </g>
          )}

          {/* pieces */}
          {groups.pieces.map((g) => {
            const per = Math.round((PIECES_PER_PORTION[g.visual] ?? 9) * sizeFactor);
            const pts = spreadPoints(shape, inner, per * g.portions, hashStr(g.id) % 100000, 12);
            return (
              <g key={g.id}>
                {pts.map((p, i) => (
                  <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                    <g transform={`rotate(${p.rot.toFixed(0)}) scale(${(p.s * piecesScale).toFixed(2)})`}>
                      <g className={animate ? "animate-drop" : ""} style={{ animationDelay: `${(i % per) * 35}ms` }}>
                        <Piece visual={g.visual} seed={hashStr(g.id) + i} />
                      </g>
                    </g>
                  </g>
                ))}
              </g>
            );
          })}

          {/* gloss */}
          {shape === "ROUND" ? (
            <ellipse cx={C - inner * 0.35} cy={C - inner * 0.45} rx={inner * 0.45} ry={inner * 0.18} fill="#fff" opacity={0.07} transform={`rotate(-25 ${C} ${C})`} />
          ) : null}
        </g>
      )}

      {hasSize && sliced && shape === "ROUND" && (
        <g stroke="#5C3615" strokeOpacity={0.35} strokeWidth={2}>
          {Array.from({ length: (size?.persons ?? 1) >= 4 ? 8 : (size?.persons ?? 1) >= 2 ? 6 : 4 }, (_, i) => i).map((i, _, arr) => {
            const a = (i / arr.length) * Math.PI * 2;
            return <line key={i} x1={C} y1={C} x2={f(C + Math.cos(a) * (R - 2))} y2={f(C + Math.sin(a) * (R - 2))} />;
          })}
        </g>
      )}

      {steam && hasSize && (
        <g opacity={0.6}>
          {[-50, 0, 50].map((dx, i) => (
            <path
              key={i}
              d={`M${C + dx},${C - 40} q-10,-20 0,-40 q10,-20 0,-40`}
              stroke="#fff"
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              className="animate-steam"
              style={{ animationDelay: `${i * 0.6}s`, transformOrigin: `${C + dx}px ${C - 40}px` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

export const PizzaArt = memo(PizzaArtInner);

/** Small icon of a single topping (for option cards) */
export function ToppingIcon({ visual, className }: { visual: string; className?: string }) {
  if (visual === "sauce")
    return (
      <svg viewBox="-20 -20 40 40" className={className}>
        <path d={blobPath(0, 2, 14, 5, 0.25, 8)} fill="#C8321B" />
        <ellipse cx={-4} cy={-2} rx={5} ry={2} fill="#FF8A70" opacity={0.5} />
        <path d="M-3,-17 q3,6 0,10" stroke="#C8321B" strokeWidth={4} strokeLinecap="round" fill="none" />
      </svg>
    );
  if (visual === "cheese")
    return (
      <svg viewBox="-20 -20 40 40" className={className}>
        <path d="M-15,8 L14,-10 L15,10 Z" fill="#F7CF55" stroke="#D9A21A" strokeWidth={1.5} strokeLinejoin="round" />
        <circle cx={4} cy={3} r={2.5} fill="#E3B23C" />
        <circle cx={10} cy={-2} r={1.6} fill="#E3B23C" />
        <circle cx={-4} cy={7} r={1.4} fill="#E3B23C" />
      </svg>
    );
  return (
    <svg viewBox="-20 -20 40 40" className={className}>
      <g transform="scale(1.25)">
        <Piece visual={visual} seed={hashStr(visual)} />
      </g>
    </svg>
  );
}
