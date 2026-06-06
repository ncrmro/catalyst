import Link from "next/link";
import { Card } from "@/components/ui/card";

interface CloudAccountCardProps {
  id: string;
  provider: string;
  alias: string;
  accountId: string;
  status: "connected" | "pending" | "error";
  region: string;
}

const statusStyles = {
  connected: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
} as const;

export function CloudAccountCard({
  id,
  provider,
  alias,
  accountId,
  status,
  region,
}: CloudAccountCardProps) {
  const maskedId = accountId.replace(/^(.{4}).*(.{4})$/, "$1••••$2");

  return (
    <Link href={`/platform/cloud-accounts/${id}`}>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-variant rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-on-surface-variant">
                {provider.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">{alias}</p>
              <p className="text-xs text-on-surface-variant font-mono">
                {maskedId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-on-surface-variant">{region}</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {status}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
