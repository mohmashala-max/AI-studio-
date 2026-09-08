import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, RefreshCw, Clock, User, FileText } from "lucide-react";
import { AuditEvent, UserSession, UserRole } from "../types";

interface AuditLogsViewProps {
  session: UserSession;
  onSwitchRole: (role: UserRole) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ session, onSwitchRole }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = session.role === "admin_executive";

  const fetchAuditEvents = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/audit-events", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (res.status === 403) {
        throw new Error("Access restricted: Requires 'admin_executive' role.");
      }
      if (!res.ok) {
        throw new Error("Failed to fetch audit events");
      }
      const data: AuditEvent[] = await res.json();
      setEvents(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [session.role, session.token]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Executive Compliance & Audit Trail
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Immutable log of all operational events, rule adjustments, and technician interventions for enterprise ISO/BRC compliance.
          </p>
        </div>
        <button
          id="refresh-audit-btn"
          onClick={fetchAuditEvents}
          disabled={isLoading || !isAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Log
        </button>
      </div>

      {!isAdmin ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Role-Based Access Enforcement</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              The compliance audit log is restricted to users with the <span className="font-mono text-rose-400 font-bold">admin_executive</span> role per M-PAS security specifications.
            </p>
          </div>
          <button
            id="switch-to-admin-btn"
            onClick={() => onSwitchRole("admin_executive")}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-medium transition"
          >
            Switch Role to Admin Executive
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
          {errorMsg && (
            <div className="p-4 bg-rose-950/40 border-b border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="divide-y divide-slate-700/80">
            {events.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                No audit events recorded yet.
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.event_id}
                  className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">
                        #{event.event_id}
                      </span>
                      <span className="font-semibold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                        {event.action}
                      </span>
                      <span className="text-slate-400">on target</span>
                      <span className="font-mono text-emerald-400 font-medium">
                        {event.resource}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        Actor: <strong className="text-slate-300">{event.actor}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(event.created_at).toLocaleTimeString()} &bull; {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Details JSON */}
                  <div className="font-mono text-[11px] bg-slate-950 px-3 py-2 rounded border border-slate-800 text-slate-300 max-w-md overflow-x-auto">
                    {JSON.stringify(event.details)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
