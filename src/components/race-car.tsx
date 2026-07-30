/** Minimal side-profile race car. Single-color, optical-balanced at 20px. */
export function RaceCar({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 16" className={className} fill="none" aria-hidden>
      <path
        d="M2 11h3.2a4.2 4.2 0 0 1 8 0h11.6a4.2 4.2 0 0 1 8 0H38"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4 10.6c0-1.9 1.3-3 3.3-3.3l5-3.5c.5-.4 1.1-.6 1.8-.6h6.4c.8 0 1.5.3 2 .9l2.7 3.2h5.5c2.3 0 4.3 1.3 4.3 3.3"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="11" r="2.6" fill={color} />
      <circle cx="28.8" cy="11" r="2.6" fill={color} />
    </svg>
  );
}
