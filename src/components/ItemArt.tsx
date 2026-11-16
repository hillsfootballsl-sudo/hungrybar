// Illustrations for non-pizza menu items (keeps the whole menu in one hand-drawn style)
export function ItemArt({ art, className }: { art?: string | null; className?: string }) {
  const [kind, color = "#F25C54"] = (art || "").split(":");
  switch (kind) {
    case "juice":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" opacity=".18" />
          <path d="M36 30 L84 30 L77 104 Q76 108 72 108 L48 108 Q44 108 43 104 Z" fill="#fff" opacity=".9" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <path d="M39 46 L81 46 L76 102 Q75.5 104 73 104 L47 104 Q44.5 104 44 102 Z" fill={color} />
          <path d="M45 52 L48 98" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 8 L62 52" stroke="#262626" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 8 L62 52" stroke="#EE4224" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 5" />
          <circle cx="84" cy="32" r="13" fill={color} stroke="#262626" strokeWidth="3" />
          <path d="M84 21 L84 43 M73 32 L95 32 M76 24 L92 40 M92 24 L76 40" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
        </svg>
      );
    case "mojito":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="108" rx="28" ry="5" fill="#000" opacity=".18" />
          <path d="M34 26 L86 26 L80 104 Q79 108 75 108 L45 108 Q41 108 40 104 Z" fill="#E9FBF3" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <path d="M37 40 L83 40 L78 102 L42 102 Z" fill={color} opacity=".55" />
          {[[48, 60], [66, 54], [56, 78], [70, 86], [46, 92]].map(([x, y], i) => (
            <rect key={i} x={x - 6} y={y - 6} width="12" height="12" rx="3" fill="#fff" opacity=".75" transform={`rotate(${i * 23} ${x} ${y})`} />
          ))}
          <path d="M50 70 q8 -10 16 0 q-8 10 -16 0Z" fill="#3F9D45" />
          <path d="M60 84 q8 -10 16 0 q-8 10 -16 0Z" fill="#3F9D45" />
          <circle cx="40" cy="30" r="12" fill="#C5E063" stroke="#262626" strokeWidth="3" />
          <circle cx="40" cy="30" r="7" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".7" />
          <path d="M74 4 L66 48" stroke="#262626" strokeWidth="5" strokeLinecap="round" />
          <path d="M84 18 q6 -12 14 -6 q-4 10 -14 6Z M88 22 q12 -2 12 8 q-10 2 -12 -8Z" fill="#3F9D45" stroke="#262626" strokeWidth="2" />
        </svg>
      );
    case "panini":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="100" rx="44" ry="7" fill="#000" opacity=".18" />
          <path d="M14 74 Q60 50 106 74 L100 90 Q60 74 20 90 Z" fill="#F7CF55" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <path d="M18 80 Q60 62 102 80" stroke="#C8321F" strokeWidth="5" fill="none" />
          <path d="M16 70 Q60 22 104 70 Q60 52 16 70Z" fill="#D9934A" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          {[34, 50, 66, 82].map((x) => (
            <path key={x} d={`M${x - 6} ${58 - (x === 50 || x === 66 ? 10 : 2)} l12 6`} stroke="#7A4317" strokeWidth="4" strokeLinecap="round" />
          ))}
          <path d="M20 90 Q60 74 100 90 L98 96 Q60 84 22 96 Z" fill="#C98A3E" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case "lasagna":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="102" rx="46" ry="7" fill="#000" opacity=".18" />
          <path d="M14 46 L106 46 L98 98 L22 98 Z" fill="#B8B8B8" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <rect x="24" y="52" width="72" height="12" rx="3" fill="#F2D27C" />
          <rect x="24" y="64" width="72" height="8" fill="#C8321F" />
          <rect x="24" y="72" width="72" height="8" fill="#F2D27C" />
          <rect x="24" y="80" width="72" height="8" fill="#B23A1E" />
          <path d="M24 52 q10 -10 18 -2 q8 -10 18 0 q10 -10 18 0 q8 -8 18 2" fill="#FBE29A" stroke="#D9A21A" strokeWidth="2" />
          <circle cx="40" cy="46" r="3" fill="#C98A3E" />
          <circle cx="70" cy="44" r="3.5" fill="#C98A3E" />
          <path d="M84 36 q8 -6 6 -14" stroke="#3F9D45" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "garlicbread":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="96" rx="40" ry="6" fill="#000" opacity=".18" />
          <path d="M20 80 Q20 40 60 36 Q100 40 100 80 Z" fill="#E9B66B" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 74 Q32 50 60 46 Q88 50 90 74Z" fill="#F8DDA6" />
          {[[44, 60], [60, 56], [74, 62], [52, 68], [68, 70]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#3F9D45" />
          ))}
          <path d="M40 66 q20 -10 40 0" stroke="#F7CF55" strokeWidth="6" strokeLinecap="round" opacity=".8" fill="none" />
          <rect x="20" y="78" width="80" height="8" rx="3" fill="#C98A3E" stroke="#262626" strokeWidth="3" />
        </svg>
      );
    case "water":
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <ellipse cx="60" cy="108" rx="20" ry="4" fill="#000" opacity=".18" />
          <rect x="52" y="8" width="16" height="10" rx="2" fill="#3AB0FF" stroke="#262626" strokeWidth="3" />
          <path d="M48 18 L72 18 L76 32 L76 102 Q76 108 70 108 L50 108 Q44 108 44 102 L44 32 Z" fill="#D9F2FF" stroke="#262626" strokeWidth="3" strokeLinejoin="round" />
          <rect x="44" y="52" width="32" height="24" fill="#EE4224" />
          <path d="M50 64 h20" stroke="#fff" strokeWidth="3" />
          <path d="M50 36 L50 98" stroke="#fff" strokeWidth="3" opacity=".7" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 120" className={className}>
          <circle cx="60" cy="60" r="40" fill="#F8EDD6" stroke="#262626" strokeWidth="3" />
          <path d="M42 60 h36 M60 42 v36" stroke="#EE4224" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
  }
}
