/**
 * DenticoLogo — sistema de identidade visual Dentico Clinical Management
 *
 * Variações:
 *  - "horizontal" → ícone + nome + subtítulo (sidebar / topbar)
 *  - "icon"       → apenas o ícone quadrado (favicon-like, avatar)
 *  - "dark"       → horizontal sobre fundo escuro (paleta invertida)
 */

type LogoVariant = "horizontal" | "icon" | "dark";

interface DenticoLogoProps {
  variant?: LogoVariant;
  /** Largura do ícone quadrado em px. O texto escala proporcionalmente. */
  iconSize?: number;
  className?: string;
}

export function DenticoLogo({
  variant = "horizontal",
  iconSize = 32,
  className = "",
}: DenticoLogoProps) {
  if (variant === "icon") {
    return <DenticoIcon size={iconSize} className={className} />;
  }
  return (
    <DenticoHorizontal
      dark={variant === "dark"}
      iconSize={iconSize}
      className={className}
    />
  );
}

/* ── Ícone quadrado (favicon / avatar) ──────────────────────────────────── */
function DenticoIcon({ size, className }: { size: number; className?: string }) {
  const r = Math.round(size * 0.22); // border-radius proporcional
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dentico"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Fundo */}
      <rect width="32" height="32" rx={r} fill="#1a3a4a" />
      {/* Dente branco */}
      <path
        d="M16 3C10.5 1.8 6 5.2 6 9.8c0 3.6 1.8 7.8 3.8 10.6 1.2 1.8 2.6 3 4 3 .7 0 1.3-1.2 1.7-3.4.4 2.2 1 3.4 1.7 3.4 1.4 0 2.8-1.2 4-3C23.2 17.6 25 13.4 25 9.8 25 5.2 21.5 1.8 16 3Z"
        fill="white"
        opacity="0.95"
      />
      {/* Ponto teal */}
      <circle cx="15.8" cy="11.5" r="3.4" fill="#00b8a9" />
      {/* Brilho interno */}
      <circle cx="14.6" cy="10.4" r="1.1" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ── Logo horizontal (sidebar) ──────────────────────────────────────────── */
function DenticoHorizontal({
  dark,
  iconSize,
  className,
}: {
  dark: boolean;
  iconSize: number;
  className?: string;
}) {
  const nameColor  = dark ? "#ffffff" : "#1a3a4a";
  const subColor   = "#00b8a9";

  const nameFontSize = Math.round(iconSize * 0.44);   // ~14px para iconSize=32
  const subFontSize  = Math.round(iconSize * 0.28);   // ~9px

  return (
    <div
      className={`flex items-center gap-2.5 ${className}`}
      style={{ minWidth: 0 }}
    >
      {/* Ícone */}
      <DenticoIcon size={iconSize} />

      {/* Texto */}
      <div style={{ minWidth: 0, lineHeight: 1 }}>
        <p
          style={{
            fontSize: nameFontSize,
            fontWeight: 700,
            color: nameColor,
            letterSpacing: "-0.4px",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          Dentico
        </p>
        <p
          style={{
            fontSize: subFontSize,
            fontWeight: 600,
            color: subColor,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginTop: 3,
            whiteSpace: "nowrap",
          }}
        >
          Clinical Management
        </p>
      </div>
    </div>
  );
}
