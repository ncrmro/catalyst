import { Card } from "@/components/ui/card";

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-primary shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  ctaLabel,
  ctaDisabled,
}: PricingCardProps) {
  return (
    <div className={highlighted ? "ring-2 ring-primary rounded-2xl" : ""}>
      <Card>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{name}</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-on-surface">{price}</span>
              {price !== "Free" && (
                <span className="text-sm text-on-surface-variant">/month base</span>
              )}
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-on-surface">
                <CheckIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            disabled={ctaDisabled}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
              ctaDisabled
                ? "bg-surface-variant text-on-surface-variant cursor-not-allowed"
                : "text-on-primary bg-primary hover:opacity-90"
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}
