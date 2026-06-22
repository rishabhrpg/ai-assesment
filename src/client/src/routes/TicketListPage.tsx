import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useOutletContext } from "react-router";
import {
  fetchTickets,
  errorMessage,
  type Ticket,
  type TicketStatus,
} from "@/api";
import type { OutletContext } from "./RootLayout";
import { statusLabel } from "@/lib/status-ui";

const STATUSES: (TicketStatus | "")[] = [
  "",
  "open",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
];

export function TicketListPage() {
  const { usersLoading } = useOutletContext<OutletContext>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchTickets({
          query: query.trim() || undefined,
          status: status || undefined,
        });
        if (!cancelled) setTickets(list);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, status]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
      <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="search"
          placeholder="Search title or description…"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus | "")}
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s as TicketStatus)}
            </option>
          ))}
        </select>
      </div>

      {usersLoading && (
        <p className="text-sm text-slate-500">Loading session context…</p>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Loading tickets…</p>
      )}
      {error && (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No tickets match your filters.{" "}
          <Link to="/tickets/new" className="font-medium text-indigo-600">
            Create one
          </Link>
          .
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                to={`/tickets/${t.id}`}
                className="block px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">{t.title}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {statusLabel(t.status)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {t.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Priority: {t.priority} · Updated{" "}
                  {new Date(t.updatedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
