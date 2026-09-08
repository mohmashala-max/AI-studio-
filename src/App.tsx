import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { FacilityOverview } from "./components/FacilityOverview";
import { InspectionStudio } from "./components/InspectionStudio";
import { VoiceAgentCard } from "./components/VoiceAgentCard";
import { WorkOrdersTable } from "./components/WorkOrdersTable";
import { AuditLogSection } from "./components/AuditLogSection";
import { UserRole, UserSession, FacilityInfo, AlertRule, WorkOrder, InspectionResult } from "./types";
import { ShieldCheck, Info, CheckCircle, Database, GitBranch, Layers } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<UserSession>({
    username: "demo",
    role: "facility_manager",
    tenant_id: "tenant-demo",
    token: "",
  });

  const [facilities, setFacilities] = useState<FacilityInfo[]>([
    {
      id: "facility-1",
      name: "Distribution Center Alpha",
      zone: "Cold Storage & Bay 3",
      traps: ["trap-1", "trap-2"],
      rule: {
        facility_id: "facility-1",
        pest_type: "any",
        threshold: 3,
        cooldown_minutes: 60,
        enabled: true,
      },
      workOrdersCount: 1,
    },
  ]);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("facility-1");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Authenticate user session based on selected role
  const authenticate = async (role: UserRole) => {
    let username = "demo";
    let password = "change-me";

    if (role === "admin_executive") {
      username = "admin";
      password = "admin-pass";
    } else if (role === "field_technician") {
      username = "tech";
      password = "tech-pass";
    }

    try {
      const res = await fetch("/api/v1/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession({
          username,
          role,
          tenant_id: data.user.tenant_id,
          token: data.access_token,
        });
        return data.access_token;
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
    return "";
  };

  // Fetch facilities list & active work orders
  const loadData = async (token = session.token) => {
    setIsRefreshing(true);
    try {
      // Check health
      const healthRes = await fetch("/health");
      setApiHealthy(healthRes.ok);

      // Load facilities
      const facRes = await fetch("/api/v1/facilities");
      if (facRes.ok) {
        const facList = await facRes.json();
        setFacilities(facList);
      }

      // Load work orders for selected facility
      const woRes = await fetch(`/api/v1/facilities/${selectedFacilityId}/work-orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (woRes.ok) {
        const woList = await woRes.json();
        setWorkOrders(woList);
      }
    } catch (err) {
      console.error("Failed to load platform data:", err);
      setApiHealthy(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize
  useEffect(() => {
    authenticate("facility_manager").then((tok) => {
      loadData(tok);
    });
  }, []);

  // When facility changes, refresh work orders
  useEffect(() => {
    if (session.token) {
      fetch(`/api/v1/facilities/${selectedFacilityId}/work-orders`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setWorkOrders(data));
    }
  }, [selectedFacilityId, session.token]);

  const handleRoleChange = async (newRole: UserRole) => {
    const tok = await authenticate(newRole);
    if (tok) {
      loadData(tok);
      showNotification(`Switched role to ${newRole.replace("_", " ").toUpperCase()}`);
    }
  };

  const handleUpdateAlertRule = async (facilityId: string, rule: AlertRule) => {
    const res = await fetch(`/api/v1/facilities/${facilityId}/alert-rule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(rule),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update alert rule");
    }

    showNotification(`Alert rule saved for ${facilityId}: threshold ${rule.threshold}`);
    loadData();
  };

  const handleUpdateWorkOrderStatus = async (
    workOrderId: string,
    status: WorkOrder["status"]
  ) => {
    const res = await fetch(`/api/v1/work-orders/${workOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      showNotification(`Work order updated to ${status}`);
      loadData();
    }
  };

  const handleInspectionCompleted = (result: InspectionResult) => {
    if (result.threshold_exceeded && result.work_order) {
      showNotification(
        `🚨 Threshold exceeded (${result.pest_count} pests)! Work order ${result.work_order.work_order_id?.slice(
          0,
          8
        )} queued.`
      );
    } else {
      showNotification(`Inspection passed: ${result.pest_count} pests detected.`);
    }
    loadData();
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const activeFacility =
    facilities.find((f) => f.id === selectedFacilityId) || facilities[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        session={session}
        onRoleChange={handleRoleChange}
        facilities={facilities}
        selectedFacilityId={selectedFacilityId}
        onFacilityChange={setSelectedFacilityId}
        apiHealthy={apiHealthy}
        onRefresh={() => loadData()}
        isRefreshing={isRefreshing}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400/40 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Architecture & Multi-Tenant Context Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100 block">
                M-PAS Industrial Pest-Management & Automation Ecosystem
              </span>
              <span className="text-slate-400 text-[11px]">
                Multi-Tenant Scopes • YOLOv9 & SAM2 Vision Inference • Autonomous ERP Queue • Voice Seam
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              Role: <strong className="text-amber-400">{session.role}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              Tenant: <strong className="text-emerald-400">{session.tenant_id}</strong>
            </span>
          </div>
        </div>

        {/* Facility Policy & Metrics */}
        {activeFacility && (
          <FacilityOverview
            facility={activeFacility}
            role={session.role}
            onUpdateRule={handleUpdateAlertRule}
            workOrdersCount={workOrders.length}
          />
        )}

        {/* Two-Column Core Operational Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Inspection Studio */}
          <div className="lg:col-span-12">
            <InspectionStudio
              facility={activeFacility}
              token={session.token}
              onInspectionCompleted={handleInspectionCompleted}
            />
          </div>

          {/* Voice Agent Card */}
          <div className="lg:col-span-5">
            <VoiceAgentCard
              session={session}
              facilityId={selectedFacilityId}
              onVoiceCommandSuccess={() => loadData()}
            />
          </div>

          {/* ERP Work Orders Table */}
          <div className="lg:col-span-7">
            <WorkOrdersTable
              workOrders={workOrders}
              role={session.role}
              onUpdateStatus={handleUpdateWorkOrderStatus}
              facilityId={selectedFacilityId}
            />
          </div>
        </div>

        {/* Executive Audit Log Section */}
        <AuditLogSection role={session.role} token={session.token} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 text-center text-xs text-slate-500 font-mono">
        M-PAS Platform (Machine-Vision Pest Alert System) • FastAPI/Node Adapter • All rights reserved
      </footer>
    </div>
  );
}
