import type { CSSProperties } from "react";

export function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <>
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </>
    ),
    back: <path d="M20 12H5m6-6-6 6 6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <circle cx="15" cy="17" r="3" fill="currentColor" />
      </>
    ),
    leaf: (
      <>
        <path d="M19 4C7 2 2 8 6 15s16 5 13-11Z" />
        <path d="m6 20 9-11M9 15l-1-4m4 1 4 1" />
      </>
    ),
    sprout: (
      <>
        <path d="M12 21V10M12 15C3 15 3 6 3 6s9-1 9 9Zm0-4c0-8 8-8 8-8s2 8-8 8Z" />
      </>
    ),
    flower: (
      <>
        <path d="M12 16v6m0-2c-5 0-5-4-5-4s5 0 5 4Z" />
        <path d="M12 4c-4-6-9 0-5 3-7 0-5 8 0 6-2 6 6 7 6 1 4 5 9-1 5-4 6-4 0-9-4-5 1-4-3-5-2-1Z" />
        <circle cx="12" cy="9" r="2" />
      </>
    ),
    heart: (
      <path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 2 11 8 15 6-4 13-10 8-15Z" />
    ),
    book: (
      <>
        <path d="M12 6c-3-3-8-3-10-2v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-7-1-10 2Zm0 0v15" />
        <path d="M5 8h3m-3 4h3m8-4h3m-3 4h3" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
        <path d="m20 1 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    delete: (
      <>
        <path d="M9 5h12v14H9l-7-7 7-7Z" />
        <path d="m12 9 6 6m0-6-6 6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01" />
      </>
    ),
    sound: (
      <>
        <path d="m3 9 5 0 5-4v14l-5-4H3V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="m3 9 5 0 5-4v14l-5-4H3V9Zm14 0 5 6m0-6-5 6" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    refresh: (
      <>
        <path d="M20 7A9 9 0 1 0 21 15M20 2v6h-6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] || paths.flower}
    </svg>
  );
}

export function BunnyFace() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="bunny-logo">
      <g stroke="#796c60" strokeWidth="1.8">
        <ellipse
          cx="23"
          cy="20"
          rx="7"
          ry="17"
          fill="#fffdf7"
          transform="rotate(-12 23 20)"
        />
        <ellipse
          cx="41"
          cy="20"
          rx="7"
          ry="17"
          fill="#fffdf7"
          transform="rotate(12 41 20)"
        />
        <path
          d="M18 13q4-8 6 10M40 22q5-15 4-11"
          stroke="#eab6b5"
          strokeWidth="4"
        />
        <ellipse cx="32" cy="41" rx="24" ry="19" fill="#fffdf7" />
      </g>
      <g fill="#66594f">
        <circle cx="24" cy="39" r="2" />
        <circle cx="40" cy="39" r="2" />
      </g>
      <path
        d="m29 45 3 2 3-2m-3 2v3m0 0q-3 2-4-1m4 1q3 2 4-1"
        fill="none"
        stroke="#bd8d81"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g fill="#f2c4b8">
        <ellipse cx="17" cy="44" rx="4" ry="2.5" />
        <ellipse cx="47" cy="44" rx="4" ry="2.5" />
      </g>
    </svg>
  );
}

function Blossom({
  kind = 0,
  color = "#e4aca2",
}: {
  kind?: number;
  color?: string;
}) {
  if (kind % 6 === 1)
    return (
      <>
        <path
          d="M-22-4Q-33-43-10-29L0-44 11-29Q34-43 22-4Q12 16 0 13-15 15-22-4"
          fill={color}
        />
        <path
          d="M-10-29Q-10-2 0 10M11-29Q13-3 0 10"
          fill="none"
          stroke="#fff5e6"
          strokeWidth="1.5"
          opacity=".65"
        />
      </>
    );
  if (kind % 6 === 5)
    return (
      <g fill="#9ab47c">
        <path d="M0 0C-44-5-32-46-9-29-1-48 24-35 13-13 44-27 48 9 21 10 41 36 5 43 0 16-23 40-43 10 0 0Z" />
        <path
          d="m-9-29 9 39 21 0M0 0 13-13"
          stroke="#688052"
          strokeWidth="2"
          fill="none"
        />
      </g>
    );
  if (kind % 6 === 3)
    return (
      <g>
        {[-18, 0, 18].flatMap((x, i) =>
          [-20, -3, 14].map((y, j) => (
            <g key={`${i}-${j}`} transform={`translate(${x} ${y})`}>
              <circle r="13" fill={color} />
              <path d="m-7-1 14 2m-7-8-1 14" stroke="#e9e0ee" strokeWidth="5" />
              <circle r="3" fill="#f2d18b" />
            </g>
          )),
        )}
      </g>
    );
  return (
    <g>
      {Array.from(
        { length: kind % 6 === 2 ? 5 : kind % 6 === 4 ? 12 : 8 },
        (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-19"
            rx={kind % 6 === 4 ? 7 : 9}
            ry="17"
            fill={color}
            transform={`rotate(${(i * 360) / (kind % 6 === 2 ? 5 : kind % 6 === 4 ? 12 : 8)})`}
          />
        ),
      )}
      <circle
        r={kind % 6 === 4 ? 14 : 11}
        fill={kind % 6 === 4 ? "#9c795a" : "#e8c878"}
      />
      <circle cx="-3" cy="-3" r="3" fill="#f5dc9b" opacity=".65" />
    </g>
  );
}

export function Flower({
  kind = 0,
  className = "",
  size = 110,
  grow = 1,
}: {
  kind?: number;
  className?: string;
  size?: number;
  grow?: number;
}) {
  const colors = [
    "#fcf6dc",
    "#e3a394",
    "#d4badc",
    "#ad9ec7",
    "#e7bc65",
    "#9ab47c",
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-65 -65 130 155"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M0 76Q-4 39 0 1"
        fill="none"
        stroke="#7e9866"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M-1 53Q-37 52-31 30 0 29-1 53" fill="#a9ba8b" />
      <path d="M-1 42Q33 39 29 20-1 22-1 42" fill="#8ba575" />
      <g
        style={{
          transform: `scale(${Math.max(0.18, grow)})`,
          transformOrigin: "0 0",
          transition: "transform 700ms ease",
        }}
      >
        <Blossom kind={kind} color={colors[kind % 6]} />
      </g>
    </svg>
  );
}

function Bunny({
  x = 0,
  y = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="#988777"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse
        cx="9"
        cy="135"
        rx="69"
        ry="18"
        fill="#b7bd96"
        opacity=".22"
        stroke="none"
      />
      <ellipse cx="-36" cy="93" rx="19" ry="18" fill="#fff9ee" />
      <path d="M-26 45Q-59 79-34 121 2 139 49 118 64 86 31 47" fill="#fcf7eb" />
      <path
        d="M-30 82Q2 102 41 80L45 118Q5 138-35 119Z"
        fill="#c4cda5"
        stroke="none"
      />
      <path d="M-22 66-22 100m52-32-3 32" stroke="#9aab7e" strokeWidth="5" />
      <path d="M-24 108Q-5 101 15 110L12 125" fill="none" stroke="#98a87d" />
      <ellipse cx="-18" cy="126" rx="23" ry="11" fill="#fff9ee" />
      <ellipse cx="32" cy="125" rx="23" ry="11" fill="#fff9ee" />
      <ellipse
        cx="-21"
        cy="-23"
        rx="15"
        ry="49"
        transform="rotate(-14 -21 -23)"
        fill="#fffaf0"
      />
      <ellipse
        cx="22"
        cy="-26"
        rx="15"
        ry="49"
        transform="rotate(13 22 -26)"
        fill="#fffaf0"
      />
      <path
        d="M-28-58Q-15-30-18-4m47-57Q17-30 20-6"
        stroke="#e9beb5"
        strokeWidth="9"
      />
      <path
        d="M-51 16Q-52-15-23-19 2-25 31-17 61-10 58 22 58 62 6 66-48 64-51 16Z"
        fill="#fffaf0"
      />
      <g fill="#756250" stroke="none">
        <ellipse cx="-16" cy="19" rx="3.5" ry="4.5" />
        <ellipse cx="26" cy="19" rx="3.5" ry="4.5" />
      </g>
      <g fill="#edb9a9" stroke="none" opacity=".75">
        <ellipse cx="-29" cy="32" rx="10" ry="6" />
        <ellipse cx="39" cy="32" rx="10" ry="6" />
      </g>
      <path d="m0 32 6 4 6-4" fill="#cc9c8f" stroke="#cc9c8f" />
      <path
        d="M6 37v7m0 0q-5 4-9-1m9 1q5 4 9-1"
        fill="none"
        strokeWidth="1.7"
      />
      <path
        d="M-37 67Q-55 71-47 85-39 95-28 84m62-16q19-8 26 4 5 11-13 17"
        fill="#fffaf0"
      />
      <g transform="translate(59 81) rotate(-18)" stroke="#849a85">
        <path d="M-3-8H32V21Q14 34-3 21Z" fill="#b7c7bb" />
        <path d="M32-3Q62-10 55 13 48 29 32 14" fill="none" strokeWidth="5" />
        <path d="m-3 13-27-13-3 8 30 17" fill="#b7c7bb" />
        <path d="m-31 0-8 0-3 12 9-4" fill="#a7b9af" />
        <path d="M4-8V-17H26v9" fill="none" strokeWidth="4" />
      </g>
    </g>
  );
}

export function GardenScene({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`garden-scene ${className}`}
      viewBox="0 0 660 440"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="344" cy="223" rx="259" ry="170" fill="#edf0df" />
      <path
        d="M88 287Q199 217 301 274T601 259V338Q312 385 77 329Z"
        fill="#e1e7ce"
      />
      <path
        d="M77 326Q252 279 419 324T601 321"
        stroke="#c6d0ab"
        strokeWidth="2"
      />
      <g fill="#fffdf7">
        <path d="M127 90c-3-17 23-25 31-9 8-24 38-14 37 2 26-7 33 21 15 25h-80c-15-2-15-17-3-18Z" />
        <path d="M444 82c-1-19 26-21 30-5 19-20 42-1 35 11 27-4 26 21 8 23h-77c-18-5-13-24 4-29Z" />
      </g>
      <g stroke="#c1b77d" strokeWidth="2" strokeLinecap="round">
        <path d="m388 52 0 13m-6-6h12M107 178v12m-6-6h12m438 14v12m-6-6h12" />
      </g>
      <g transform="translate(520 211)" fill="#d9bbcf">
        <path d="M0 0Q-34-39-40-9-35 15 0 0Z" />
        <path d="M0 0Q25-42 36-16 36 8 0 0Z" />
        <path d="M0 0Q-27 18-12 25 2 25 0 0Zm0 0Q23 10 17 22 6 31 0 0Z" />
        <path d="M0-5v23" stroke="#938578" strokeWidth="2" />
      </g>
      <Bunny x={362} y={221} scale={1.14} />
      <g transform="translate(177 301) scale(.75)">
        <path
          d="M0 72V-6m0 46Q-37 39-30 18 0 16 0 40m0 18Q33 58 30 35-1 35 0 58"
          stroke="#8fa577"
          strokeWidth="5"
          fill="#acbc91"
        />
        <Blossom kind={1} color="#dfab9d" />
      </g>
      <g transform="translate(115 321) scale(.51)">
        <path
          d="M0 65V0m0 40Q-33 38-29 18-2 19 0 40"
          stroke="#8fa577"
          strokeWidth="5"
          fill="#a8ba8b"
        />
        <Blossom color="#fff9e7" />
      </g>
      <g transform="translate(246 319) scale(.55)">
        <path
          d="M0 67V0m0 44Q31 43 26 21 0 25 0 44"
          stroke="#8fa577"
          strokeWidth="5"
          fill="#a8ba8b"
        />
        <Blossom kind={2} color="#c3afd2" />
      </g>
      <g transform="translate(527 318) scale(.68)">
        <path
          d="M0 65V-4m0 40Q-31 36-29 16 0 18 0 40m0 18Q28 51 26 34-1 34 0 58"
          stroke="#8fa577"
          strokeWidth="5"
          fill="#a8ba8b"
        />
        <Blossom color="#fff9e7" />
      </g>
      <g fill="#b4c39a">
        <path d="m92 361-11-27 1 28-17-12 10 15m493-9 13-32-3 32 20-15-9 20" />
      </g>
      <g stroke="#c7b4a1" strokeWidth="2" strokeLinecap="round">
        <path d="m209 386 15-4m234 7 14 3m-330-7 9 2" />
      </g>
      <g fill="#d6bc87">
        <circle cx="297" cy="99" r="3" />
        <circle cx="574" cy="258" r="3" />
        <circle cx="74" cy="266" r="3" />
      </g>
    </svg>
  );
}

export function GrowingPlant({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 240 260" className="growing-plant" aria-hidden="true">
      <ellipse cx="120" cy="236" rx="76" ry="11" fill="#e5dfca" />
      <path d="M77 185h86l-10 47q-34 15-66 0Z" fill="#dbaf95" />
      <path d="M73 179q47-11 94 0v17q-48 9-94 0Z" fill="#e8c2a6" />
      <path
        d={`M120 181Q${110 - progress * 5} 140 120 ${165 - progress * 105}`}
        fill="none"
        stroke="#8b9f6b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g
        style={{
          opacity: progress > 0.15 ? 1 : 0.2,
          transition: "opacity 500ms",
        }}
      >
        <path d="M119 155q-49 3-43-29 38-1 43 29" fill="#acbb8e" />
        <path d="M119 133q43-2 39-29-36 2-39 29" fill="#91a97b" />
      </g>
      <g
        transform={`translate(120 ${165 - progress * 105})`}
        style={{ transformBox: "view-box" } as CSSProperties}
      >
        <g
          style={{
            transform: `scale(${0.22 + progress * 0.78})`,
            transition: "transform 600ms",
          }}
        >
          <Blossom
            kind={progress < 0.65 ? 1 : 0}
            color={progress < 0.65 ? "#d5b0c5" : "#fff9e7"}
          />
        </g>
      </g>
    </svg>
  );
}
