import React from "react";
import { ShieldCheck, Cpu, Building2, UserCircle, RefreshCw, LogOut } from "lucide-react";
import { UserRole, UserSession, FacilityInfo } from "../types";
import pmasLogo from "../assets/images/pmas_logo_1788905609728.jpg";

interface HeaderProps {
  session: UserSession;
  onRoleChange: (role: UserRole) => void;
  facilities: FacilityInfo[];
  selectedFacilityId: string;
  onFacilityChange: (id: string) => void;
  apiHealthy: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onRoleChange,
  facilities,
  selectedFacilityId,
  onFacilityChange,
  apiHealthy,
  onRefresh,
  isRefreshing,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & System Status */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <img
                src={pmasLogo}
                alt="PMAS Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">PMAS</span>
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Lasioderma AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Tobacco Beetle Predictive Monitoring &amp; Microclimate Engine
              </p>
            </div>
          </div>

          {/* Engine Status Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                apiHealthy ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300 font-medium">Model:</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> YOLOv8-nano + Sensirion SHT31
            </span>
          </div>

          {/* Controls: Facility Selector & Role Switcher & Sign Out */}
          <div className="flex items-center space-x-3">
            {/* Facility Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="facility-select"
                aria-label="Select facility"
                value={selectedFacilityId}
                onChange={(e) => onFacilityChange(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id} className="bg-slate-900 text-slate-200">
                    {fac.name} ({fac.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5 text-amber-400" />
              <select
                id="role-select"
                aria-label="Select user role"
                value={session.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="facility_manager" className="bg-slate-900 text-slate-200">
                  Facility Manager ({session.username})
                </option>
                <option value="field_technician" className="bg-slate-900 text-slate-200">
                  Field Tech (tech)
                </option>
                <option value="admin_executive" className="bg-slate-900 text-slate-200">
                  Admin Executive (admin)
                </option>
              </select>
            </div>

            {/* User Profile Badge */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-mono font-medium">{session.username || "Operator"}</span>
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Logout Button */}
            <button
              id="logout-btn"
              onClick={onLogout}
              title="Logout from PMAS"
              aria-label="Logout"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 hover:text-white transition text-xs font-semibold shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
