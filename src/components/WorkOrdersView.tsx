import React, { useState, useEffect } from "react";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight, RefreshCw, Filter } from "lucide-react";
import { WorkOrder, UserSession } from "../types";

interface WorkOrdersViewProps {
  session: UserSession;
  facilityId: string;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({ session, facilityId }) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWorkOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/work-orders`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load work orders");
      const data = await res.json();
      setWorkOrders(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [facilityId, session.token]);

  const handleUpdateStatus = async (workOrderId: string, nextStatus: WorkOrder["status"]) => {
    setUpdatingId(workOrderId);
    try {
      const res = await fetch(`/api/v1/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update work order");
      }
      const updated: WorkOrder = await res.json();
      setWorkOrders((prev) =>
        prev.map((item) => (item.work_order_id === updated.work_order_id ? updated : item))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    if (selectedFilter === "all") return true;
    return wo.status === selectedFilter;
  });

  const getStatusBadge = (status: WorkOrder["status"]) => {
    switch (status) {
      case "requested":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Requested
          </span>
        );
      case "acknowledged":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <AlertCircle className="w-3 h-3" /> Acknowledged
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Field Operations & ERP Work Orders
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track threshold incidents, dispatch field technicians, and sync state changes with SAP / Maximo ERP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="refresh-work-orders-btn"
            onClick={fetchWorkOrders}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter by Status:
        </span>
        {["all", "requested", "acknowledged", "in_progress", "completed", "cancelled"].map((st) => (
          <button
            key={st}
            id={`filter-${st}-btn`}
            onClick={() => setSelectedFilter(st)}
            className={`text-xs capitalize px-3 py-1 rounded-full font-medium transition ${
              selectedFilter === st
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700"
            }`}
          >
            {st} {st === "all" ? `(${workOrders.length})` : ""}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Work Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-10 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-medium text-sm text-slate-300">No Work Orders Found</p>
            <p className="text-xs text-slate-500 mt-1">
              No work orders match the current filter for facility <span className="font-mono text-slate-400">{facilityId}</span>. Run an AI inspection exceeding the threshold to generate an order.
            </p>
          </div>
        ) : (
          filteredOrders.map((wo) => (
            <div
              key={wo.work_order_id}
              className="bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {wo.work_order_id}
                  </span>
                  {getStatusBadge(wo.status)}
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      wo.priority === "high"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-slate-700/60 text-slate-300 border border-slate-600"
                    }`}
                  >
                    Priority: {wo.priority}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Facility: <span className="text-slate-200 font-medium">{wo.facility_id}</span>
                  </span>
                  <span>
                    Trap: <span className="text-slate-200 font-medium">{wo.trap_id}</span>
                  </span>
                  <span>
                    Pest Count: <span className="text-slate-200 font-bold font-mono">{wo.pest_count}</span>
                  </span>
                </div>

                {wo.reason && (
                  <p className="text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-700/50 mt-1">
                    <span className="text-slate-400">Trigger Reason:</span> {wo.reason}
                  </p>
                )}
              </div>

              {/* Action Buttons for technicians / managers */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {wo.status === "requested" && (
                  <button
                    id={`ack-${wo.work_order_id}`}
                    onClick={() => handleUpdateStatus(wo.work_order_id, "acknowledged")}
                    disabled={updatingId === wo.work_order_id}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                )}
                {["requested", "acknowledged"].includes(wo.status) && (
                  <button
                    id={`start-${wo.work_order_id}`}
                    onClick={() => handleUpdateStatus(wo.work_order_id, "in_progress")}
                    disabled={updatingId === wo.work_order_id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    Start Treatment
                  </button>
                )}
                {wo.status === "in_progress" && (
                  <button
                    id={`complete-${wo.work_order_id}`}
                    onClick={() => handleUpdateStatus(wo.work_order_id, "completed")}
                    disabled={updatingId === wo.work_order_id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                )}
                {!["completed", "cancelled"].includes(wo.status) && (
                  <button
                    id={`cancel-${wo.work_order_id}`}
                    onClick={() => handleUpdateStatus(wo.work_order_id, "cancelled")}
                    disabled={updatingId === wo.work_order_id}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
