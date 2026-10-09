import React, { useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { editEmployeeDetails, softDeleteEmployee } from "@/actions/employees";
import { Role } from "@prisma/client";

interface EditOperatorModalProps {
  operator: {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOperatorModal({ operator, onClose, onSuccess }: EditOperatorModalProps) {
  const [name, setName] = useState(operator.name);
  const [phone, setPhone] = useState(operator.phone || "");
  const [role, setRole] = useState<Role>(operator.role || Role.OPERATOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to send ${operator.name} to Pending Deletions?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await softDeleteEmployee(operator.id);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to soft delete.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Strip everything non-numeric for phone
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      setLoading(false);
      return;
    }

    try {
      const res = await editEmployeeDetails(operator.id, { name, phone: normalizedPhone, role });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update operator.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">Edit Operator</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-800 text-zinc-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone Number (10 digits)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="OPERATOR">Operator</option>
              <option value="DRIVER">Driver</option>
              <option value="WORKER">Worker (Helper)</option>
              <option value="STAFF">Office Staff</option>
            </select>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Changes
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-950/40 border border-red-500/30 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-900/60 transition-colors"
            >
              Send to Pending Deletions (Trash)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
