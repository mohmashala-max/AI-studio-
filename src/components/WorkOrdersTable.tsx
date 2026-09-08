import React, { useState } from "react";
import { FileText, ArrowRight, Check, Clock, AlertTriangle, ShieldCheck, Filter } from "lucide-react";
import { WorkOrder, UserRole } from "../types";

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
  role: UserRole;
  onUpdateStatus: (workOrderId: string, status: WorkOrder["status"]) => Promise<void>;
  facilityId: string;
}

const STATUS_CONFIG: Record<
  WorkOrder["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  requested: {
    label: "Requested (ERP Queue)",
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-500/40",
  },
  acknowledged: {
    label: "Acknowledged",
    color: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-500/40",
  },
  in_progress: {
    label: "In Progress (Field Tech)",
    color: "text-purple-400",
    bg: "bg-purple-950/40",
    border: "border-purple-500/40",
  },
  completed: {
    label: "Treated & Resolved",
    color: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/40",
  },
  cancelled: {
    label: "Cancelled / False Alarm",
    color: "text-slate-400",
    bg: "bg-slate-900",
    border: "border-slate-700",
  },
};

export const WorkOrdersTable: React.FC<WorkOrdersTableProps> = ({
  workOrders,
  role,
  onUpdateStatus,
  facilityId,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = workOrders.filter((wo) => {
    if (filterStatus !== "all" && wo.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = async (workOrderId: string, newStatus: WorkOrder["status"]) => {
    setUpdatingId(workOrderId);
    try {
      await onUpdateStatus(workOrderId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              ERP Work Orders & Remediation Queue
              <span className="text-xs px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-mono">
                {workOrders.length} records
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Automated SAP / Oracle dispatch queue with idempotent threshold triggering
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="status-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-slate-900/50 rounded-lg border border-slate-800 text-slate-400 text-xs">
          No work orders match the selected filter for {facilityId}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-700/80">
              <tr>
                <th className="py-3 px-3">Order ID / Target</th>
                <th className="py-3 px-3">Pest Load</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Reason / Trigger</th>
                <th className="py-3 px-3 text-right">Technician Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 font-medium">
              {filtered.map((wo) => {
                const cfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG.requested;
                const isWorking = updatingId === wo.work_order_id;

                return (
                  <tr key={wo.work_order_id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-200 font-semibold">
                        {wo.work_order_id.slice(0, 16)}...
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Trap: <span className="text-emerald-400">{wo.trap_id}</span> • {wo.facility_id}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-amber-400 font-bold text-sm">{wo.pest_count}</span>
                      <span className="text-slate-500 text-[10px] ml-1">insects</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          wo.priority === "high"
                            ? "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {wo.priority}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {cfg.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate text-[11px]">
                      {wo.reason || "Autonomous threshold trigger"}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <select
                        id={`status-select-${wo.work_order_id}`}
                        value={wo.status}
                        disabled={isWorking}
                        onChange={(e) =>
                          handleStatusChange(wo.work_order_id, e.target.value as WorkOrder["status"])
                        }
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="requested">Requested</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
