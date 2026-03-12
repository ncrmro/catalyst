interface UsageBarProps {
  label: string;
  current: number;
  max: number;
}

export function UsageBar({ label, current, max }: UsageBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const atLimit = current >= max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">{label}</span>
        <span className={atLimit ? "text-error font-medium" : "text-on-surface"}>
          {current} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-error" : "bg-primary"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
