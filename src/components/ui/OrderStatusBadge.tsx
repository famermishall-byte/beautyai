import { Badge, type Tone } from "@/components/ui/Badge";

// One status → one tone, everywhere an order status is shown (customer "Мои покупки", admin orders).
const STATUS_TONE: Record<string, Tone> = {
  sent: "info", // new / sent — waiting for the branch
  confirmed: "accent",
  paid: "success",
  shipped: "accent",
  completed: "neutral",
  cancelled: "error",
};

export function OrderStatusBadge({ status, label, size }: { status: string; label: string; size?: "xs" | "sm" }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} size={size}>
      {label}
    </Badge>
  );
}
