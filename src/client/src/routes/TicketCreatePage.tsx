import { FormEvent, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { createTicket, errorMessage, type Priority } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import type { OutletContext } from "./RootLayout";

export function TicketCreatePage() {
  const { users, usersLoading } = useOutletContext<OutletContext>();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only admin and manager can assign tickets during creation
  const canAssign = hasRole("admin", "manager");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a ticket.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        assignedTo: canAssign && assignedTo ? Number(assignedTo) : null,
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">New ticket</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
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
            <p className="mt-1 text-xs text-slate-500">
              Only admin and manager can assign tickets
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || usersLoading || !user}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
