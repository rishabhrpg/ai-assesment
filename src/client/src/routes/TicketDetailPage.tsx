import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import {
  addComment,
  fetchTicket,
  patchTicket,
  errorMessage,
  type TicketStatus,
  type Priority,
} from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import type { OutletContext } from "./RootLayout";
import { allowedNextStatuses, statusLabel } from "@/lib/status-ui";

export function TicketDetailPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { users, usersLoading } = useOutletContext<OutletContext>();
  const { user, hasRole, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Awaited<
    ReturnType<typeof fetchTicket>
  > | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [comment, setComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  // Compute permissions for this ticket
  const canEdit = useMemo(() => {
    if (!user || !ticket) return false;
    if (hasRole("admin", "manager")) return true;
    if (ticket.ticket.createdBy === user.id && hasPermission("tickets:update:own")) return true;
    if (ticket.ticket.assignedTo === user.id && hasPermission("tickets:update:assigned")) return true;
    return false;
  }, [user, ticket, hasRole, hasPermission]);

  const canAssign = useMemo(() => {
    return hasRole("admin", "manager");
  }, [hasRole]);

  const canChangeStatus = useMemo(() => {
    return canEdit;
  }, [canEdit]);

  const load = async () => {
    if (!Number.isInteger(id) || id < 1) {
      setError("Invalid ticket id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicket(id);
      setTicket(data);
      setTitle(data.ticket.title);
      setDescription(data.ticket.description);
      setPriority(data.ticket.priority);
      setAssignedTo(
        data.ticket.assignedTo != null ? String(data.ticket.assignedTo) : ""
      );
    } catch (e) {
      setError(errorMessage(e));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const userName = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.name]));
    return (uid: number) => map.get(uid) ?? `User #${uid}`;
  }, [users]);

  async function onSaveFields(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await patchTicket(id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        assignedTo: assignedTo ? Number(assignedTo) : null,
      });
      setTicket((prev) =>
        prev ? { ...prev, ticket: updated } : { ticket: updated, comments: [] }
      );
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onChangeStatus(next: TicketStatus) {
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await patchTicket(id, { status: next });
      setTicket((prev) => (prev ? { ...prev, ticket: updated } : prev));
    } catch (err) {
      setStatusError(errorMessage(err));
    } finally {
      setStatusBusy(false);
    }
  }

  async function onAddComment(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setCommentError("You must be logged in to comment.");
      return;
    }
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const c = await addComment(id, {
        message: comment.trim(),
      });
      setComment("");
      setTicket((prev) =>
        prev ? { ...prev, comments: [...prev.comments, c] } : prev
      );
    } catch (err) {
      setCommentError(errorMessage(err));
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading ticket…</p>;
  }
  if (error || !ticket) {
    return (
      <div className="space-y-3">
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error ?? "Not found"}
        </div>
        <Link to="/" className="text-sm font-medium text-indigo-600">
          Back to list
        </Link>
      </div>
    );
  }

  const nextStatuses = allowedNextStatuses(ticket.ticket.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← All tickets
        </Link>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {statusLabel(ticket.ticket.status)}
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900">
        {ticket.ticket.title}
      </h1>

      {/* Status Section - Only show if user can change status */}
      {canChangeStatus && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Status</h2>
          <p className="mt-1 text-sm text-slate-600">
            Changes must follow the lifecycle: Open → In progress → Resolved →
            Closed; Open or In progress may be Cancelled.
          </p>
          {statusError && (
            <p
              className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              role="alert"
            >
              {statusError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {nextStatuses.length === 0 ? (
              <span className="text-sm text-slate-500">No further transitions.</span>
            ) : (
              nextStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusBusy}
                  onClick={() => void onChangeStatus(s)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Mark as {statusLabel(s)}
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {/* Edit Form - Only show if user can edit */}
      {canEdit && (
        <form
          onSubmit={onSaveFields}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-medium text-slate-900">Edit details</h2>
          {saveError && (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {saveError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              required
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {canAssign && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Assignee
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Comments</h2>
        <ul className="mt-4 space-y-3">
          {ticket.comments.length === 0 ? (
            <li className="text-sm text-slate-500">No comments yet.</li>
          ) : (
            ticket.comments.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <p className="text-slate-800">{c.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {userName(c.createdBy)} ·{" "}
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
        <form onSubmit={onAddComment} className="mt-4 space-y-2">
          {commentError && (
            <p className="text-sm text-red-700">{commentError}</p>
          )}
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            placeholder="Write a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={
              commentSubmitting || !comment.trim() || !user || usersLoading
            }
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {commentSubmitting ? "Adding…" : "Add comment"}
          </button>
        </form>
      </section>
    </div>
  );
}
