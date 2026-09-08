import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Activity, Eye } from "lucide-react";
import { AuditEvent, UserRole } from "../types";

interface AuditLogSectionProps {
  role: UserRole;
  token: string;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({ role, token }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "admin_executive";

  const fetchAuditEvents = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/audit-events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted: Requires admin_executive role");
        }
        throw new Error("Failed to fetch audit events");
      }

      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [role, token]);

  if (!isAdmin) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200">Compliance & SIEM Immutable Audit Trail</h4>
            <p className="text-slate-400">
              Restricted to <span className="text-amber-400 font-mono">admin_executive</span> role.
              Switch role in the top header to inspect security logs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Executive Audit Trail & Tamper-Evident Ledger
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
                GET /api/v1/audit-events
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Immutable log stream for compliance, AI inspections, policy changes, and ERP updates
            </p>
          </div>
        </div>

        <button
          id="refresh-audit-btn"
          onClick={fetchAuditEvents}
          disabled={loading}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition"
        >
          {loading ? "Loading..." : "Refresh Logs"}
        </button>
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No audit events recorded yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {events.map((evt) => (
            <div
              key={evt.event_id}
              className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-semibold">{evt.action}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 font-mono">Actor: {evt.actor}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-mono">Res: {evt.resource}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {JSON.stringify(evt.details)}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                {new Date(evt.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
