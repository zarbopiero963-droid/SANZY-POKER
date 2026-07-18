/**
 * Logo Sanzy Poker — ricostruzione vettoriale del tavolo-marchio originale:
 * feltro verde ovale con bordo legno, "SANZY" bianco in alto, "POKER" rosso in
 * basso, il board dei due piatti (fila 3 + 2 + 1 e i due del Piatto 2) e i
 * quattro semi negli angoli. Scala senza perdita di qualità (SVG puro).
 */

type SanzyLogoProps = {
  className?: string;
  title?: string;
};

const FELT = "#1C7A54";
const FELT_DARK = "#12603F";
const RAIL = "#5A3B2B";
const RAIL_DARK = "#3E2619";
const LINE = "#F2EFE4";
const WHITE = "#F7F5EF";
const RED = "#D8433F";
const INK = "#1C1C1C";

/** Cornice bianca arrotondata con un seme al centro (angoli del tavolo). */
function SuitBadge({
  x,
  y,
  glyph,
  color,
}: {
  x: number;
  y: number;
  glyph: string;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-34}
        y={-34}
        width={68}
        height={68}
        rx={12}
        fill={WHITE}
        stroke="#00000022"
        strokeWidth={2}
      />
      <text
        x={0}
        y={2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={46}
        fill={color}
        fontFamily="'Segoe UI Symbol','Noto Sans Symbols2',sans-serif"
      >
        {glyph}
      </text>
    </g>
  );
}

/** Sagoma di una carta del board (contorno bianco su feltro). */
function CardSlot({
  x,
  y,
  w = 46,
  h = 64,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={6}
      fill="none"
      stroke={LINE}
      strokeWidth={3.5}
      opacity={0.92}
    />
  );
}

export default function SanzyLogo({ className, title }: SanzyLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1000 600"
      role="img"
      aria-label={title ?? "Sanzy Poker"}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <radialGradient id="sanzy-felt" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor={FELT} />
          <stop offset="100%" stopColor={FELT_DARK} />
        </radialGradient>
        <linearGradient id="sanzy-rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RAIL} />
          <stop offset="100%" stopColor={RAIL_DARK} />
        </linearGradient>
      </defs>

      {/* Tavolo: bordo legno + feltro */}
      <ellipse cx={500} cy={300} rx={478} ry={286} fill="url(#sanzy-rail)" />
      <ellipse cx={500} cy={300} rx={452} ry={260} fill="url(#sanzy-felt)" />
      {/* Racetrack: linea di gioco bianca */}
      <ellipse
        cx={500}
        cy={300}
        rx={410}
        ry={222}
        fill="none"
        stroke={LINE}
        strokeWidth={4}
        opacity={0.85}
      />

      {/* SANZY */}
      <text
        x={500}
        y={196}
        textAnchor="middle"
        fontSize={150}
        fontWeight={800}
        letterSpacing={10}
        fill={WHITE}
        fontFamily="'Cinzel','Manrope',serif"
      >
        SANZY
      </text>

      {/* Board dei due piatti: fila 3 + 2 + 1 (Piatto 1) e i due del Piatto 2 */}
      <g>
        <CardSlot x={296} y={270} />
        <CardSlot x={348} y={270} />
        <CardSlot x={400} y={270} />
        <CardSlot x={470} y={270} />
        <CardSlot x={522} y={270} />
        <CardSlot x={592} y={270} />
        {/* Piatto 2: due carte impilate a destra */}
        <CardSlot x={662} y={244} w={44} h={44} />
        <CardSlot x={662} y={296} w={44} h={44} />
      </g>

      {/* POKER */}
      <text
        x={500}
        y={430}
        textAnchor="middle"
        fontSize={132}
        fontWeight={800}
        letterSpacing={12}
        fill={RED}
        fontFamily="'Cinzel','Manrope',serif"
      >
        POKER
      </text>

      {/* Quattro semi agli angoli */}
      <SuitBadge x={214} y={150} glyph="♥" color={RED} />
      <SuitBadge x={786} y={150} glyph="♠" color={INK} />
      <SuitBadge x={214} y={450} glyph="♣" color={INK} />
      <SuitBadge x={786} y={450} glyph="♦" color={RED} />
    </svg>
  );
}
