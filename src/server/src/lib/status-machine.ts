/**
 * Ticket status lifecycle (Core requirement).
 * open → in_progress → resolved → closed
 * open → cancelled, in_progress → cancelled
 */

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["resolved", "cancelled"],
  resolved: ["closed"],
  closed: [],
  cancelled: [],
};

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertValidTransition(
  from: TicketStatus,
  to: TicketStatus
): void {
  if (from === to) return;
  if (!canTransition(from, to)) {
    const err = new Error(
      `Invalid status transition: ${from} → ${to}. Allowed from ${from}: ${VALID_TRANSITIONS[from].join(", ") || "(terminal)"}`
    );
    (err as Error & { code: string }).code = "INVALID_STATUS_TRANSITION";
    throw err;
  }
}
