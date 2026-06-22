import type { TicketStatus } from "@/api";

export function allowedNextStatuses(current: TicketStatus): TicketStatus[] {
  const map: Record<TicketStatus, TicketStatus[]> = {
    open: ["in_progress", "cancelled"],
    in_progress: ["resolved", "cancelled"],
    resolved: ["closed"],
    closed: [],
    cancelled: [],
  };
  return map[current];
}

export function statusLabel(s: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return labels[s];
}
