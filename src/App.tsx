import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Login } from "./components/Login";
import { FacilityOverview } from "./components/FacilityOverview";
import { TobaccoBeetleAnalytics } from "./components/TobaccoBeetleAnalytics";
import { DocumentedActionLog } from "./components/DocumentedActionLog";
import { InspectionStudio } from "./components/InspectionStudio";
import { VoiceAgentCard } from "./components/VoiceAgentCard";
import { WorkOrdersTable } from "./components/WorkOrdersTable";
import { AuditLogSection } from "./components/AuditLogSection";
import { UserRole, UserSession, FacilityInfo, AlertRule, WorkOrder, InspectionResult } from "./types";
import {
  ShieldCheck,
  Info,
  CheckCircle,
  Database,
  GitBranch,
  Layers,
  BarChart3,
  ClipboardList,
  Camera,
  Wrench,
  Mic,
  ScrollText,
  LogOut,
} from "lucide-react";

export default function App() {
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = sessionStorage.getItem("pmas_session");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      username: "",
      role: "facility_manager",
      tenant_id: "",
      token: "",
    };
  });

  const [facilities, setFacilities] = useState<FacilityInfo[]>([
    {
      id: "facility-1",
      name: "Distribution Center Alpha",
      zone: "Cold Storage & Bay 3",
      traps: ["trap-tb-01", "trap-tb-02", "trap-tb-03", "trap-tb-04"],
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
  const [activeTab, setActiveTab] = useState<
    "analytics" | "actions" | "vision" | "work_orders" | "voice" | "audit" | "all"
  >("analytics");
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
        const updated: UserSession = {
          username,
          role,
          tenant_id: data.user.tenant_id,
          token: data.access_token,
        };
        setSession(updated);
        try {
          sessionStorage.setItem("pmas_session", JSON.stringify(updated));
        } catch {
          // ignore
        }
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
    fetch("/health")
      .then((res) => setApiHealthy(res.ok))
      .catch(() => setApiHealthy(false));

    if (session.token) {
      loadData(session.token);
    }
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

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    try {
      sessionStorage.setItem("pmas_session", JSON.stringify(newSession));
    } catch {
      // ignore
    }
    loadData(newSession.token);
    showNotification(`Authenticated as ${newSession.username} (${newSession.role})`);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("pmas_session");
    } catch {
      // ignore
    }
    setSession({
      username: "",
      role: "facility_manager",
      tenant_id: "",
      token: "",
    });
    showNotification("Signed out of PMAS platform");
  };

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

  // If user is not authenticated, display dedicated PMAS Login Screen
  if (!session.token) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        apiHealthy={apiHealthy}
      />
    );
  }

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
        onLogout={handleLogout}
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
        {/* Architecture & Tobacco Beetle Domain Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-750 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm block">
                Tobacco Beetle (<em>Lasioderma serricorne</em>) Monitoring &amp; Prediction System
              </span>
              <span className="text-slate-400 text-[11px]">
                Serricornin smart traps • Humidity-weighted microclimate risk engine (45/35/20) • 15-20 day breeding wave forecast
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 flex-wrap">
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-sans">
              User: <strong className="text-slate-200">{session.username || "demo"}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
              Role: <strong className="text-amber-400">{session.role}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
              Sensor: <strong className="text-cyan-400">SHT31 (RH &amp; Temp)</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
              Model: <strong className="text-emerald-400">YOLOv8-nano</strong>
            </span>
            <button
              id="dashboard-ribbon-logout-btn"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/40 font-sans font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Logout from dashboard"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Facility Policy & Key Environmental Indicators */}
        {activeFacility && (
          <FacilityOverview
            facility={activeFacility}
            role={session.role}
            onUpdateRule={handleUpdateAlertRule}
            workOrdersCount={workOrders.length}
          />
        )}

        {/* Operational View Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold">
          <button
            id="tab-analytics-btn"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Telemetry &amp; 15-20d Predictive Engine</span>
          </button>

          <button
            id="tab-actions-btn"
            onClick={() => setActiveTab("actions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "actions"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Documented Actions &amp; 15-20d Impact</span>
          </button>

          <button
            id="tab-vision-btn"
            onClick={() => setActiveTab("vision")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "vision"
                ? "bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span>YOLOv8 Dusk Trap &amp; Morphology</span>
          </button>

          <button
            id="tab-workorders-btn"
            onClick={() => setActiveTab("work_orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "work_orders"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Wrench className="w-4 h-4 text-rose-400" />
            <span>ERP Remediation Work Orders ({workOrders.length})</span>
          </button>

          <button
            id="tab-voice-btn"
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "voice"
                ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Mic className="w-4 h-4 text-purple-400" />
            <span>Voice Command Assistant</span>
          </button>

          <button
            id="tab-audit-btn"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-slate-700 text-white border border-slate-600 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <ScrollText className="w-4 h-4 text-slate-400" />
            <span>Audit Trail</span>
          </button>

          <button
            id="tab-all-btn"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-slate-700 text-white border border-slate-600 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4 text-slate-300" />
            <span>All Modules</span>
          </button>
        </div>

        {/* Tab View Content Rendering */}
        {activeTab === "analytics" && (
          <TobaccoBeetleAnalytics
            facilityId={selectedFacilityId}
            token={session.token}
            onOpenActionModal={() => setActiveTab("actions")}
          />
        )}

        {activeTab === "actions" && (
          <DocumentedActionLog
            facilityId={selectedFacilityId}
            token={session.token}
            role={session.role}
          />
        )}

        {activeTab === "vision" && (
          <InspectionStudio
            facility={activeFacility}
            token={session.token}
            onInspectionCompleted={handleInspectionCompleted}
          />
        )}

        {activeTab === "work_orders" && (
          <WorkOrdersTable
            workOrders={workOrders}
            role={session.role}
            onUpdateStatus={handleUpdateWorkOrderStatus}
            facilityId={selectedFacilityId}
          />
        )}

        {activeTab === "voice" && (
          <div className="max-w-2xl mx-auto">
            <VoiceAgentCard
              session={session}
              facilityId={selectedFacilityId}
              onVoiceCommandSuccess={() => loadData()}
            />
          </div>
        )}

        {activeTab === "audit" && (
          <AuditLogSection role={session.role} token={session.token} />
        )}

        {activeTab === "all" && (
          <div className="space-y-6">
            <TobaccoBeetleAnalytics
              facilityId={selectedFacilityId}
              token={session.token}
              onOpenActionModal={() => setActiveTab("actions")}
            />
            <DocumentedActionLog
              facilityId={selectedFacilityId}
              token={session.token}
              role={session.role}
            />
            <InspectionStudio
              facility={activeFacility}
              token={session.token}
              onInspectionCompleted={handleInspectionCompleted}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <VoiceAgentCard
                  session={session}
                  facilityId={selectedFacilityId}
                  onVoiceCommandSuccess={() => loadData()}
                />
              </div>
              <div className="lg:col-span-7">
                <WorkOrdersTable
                  workOrders={workOrders}
                  role={session.role}
                  onUpdateStatus={handleUpdateWorkOrderStatus}
                  facilityId={selectedFacilityId}
                />
              </div>
            </div>
            <AuditLogSection role={session.role} token={session.token} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 text-center text-xs text-slate-500 font-mono">
        PMAS Platform (Pest Management Automation System) • Node/Express & React Runtime • All rights reserved
      </footer>
    </div>
  );
}
