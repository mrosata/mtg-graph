type Props = {
  size?: number;
  className?: string;
};

export default function FishIcon({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2 8c1-2.5 3.5-4 6-4s4.5 1.5 5.5 4c-1 2.5-3 4-5.5 4s-5-1.5-6-4z" />
      <path d="M13.5 8L15.5 5.5v5z" />
      <circle cx="10.5" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
