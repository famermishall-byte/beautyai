import { Badge, type Tone } from "@/components/ui/Badge";

// One status → one tone, everywhere an order status is shown (customer "Мои покупки", admin orders).
// Mapping inherited from the admin order list, where it was established first.
const STATUS_TONE: Record<string, Tone> = {
  sent: "accent", // new — waiting for the branch
  confirmed: "warning", // confirmed, not paid yet
  paid: "success",
  shipped: "success",
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
