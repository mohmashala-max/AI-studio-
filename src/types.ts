export type UserRole = "admin_executive" | "field_technician" | "facility_manager";

export interface UserSession {
  username: string;
  role: UserRole;
  tenant_id: string;
  token: string;
}

export interface Detection {
  label: string;
  confidence: number;
  area_ratio: number;
  source?: string;
  bbox?: [number, number, number, number]; // [x_pct, y_pct, width_pct, height_pct]
}

export interface AlertRule {
  facility_id: string;
  pest_type: string;
  threshold: number;
  cooldown_minutes: number;
  enabled: boolean;
}

export interface WorkOrder {
  work_order_id: string;
  facility_id: string;
  trap_id: string;
  pest_count: number;
  priority: "normal" | "high";
  status: "requested" | "acknowledged" | "in_progress" | "completed" | "cancelled";
  created_at?: string;
  updated_at?: string;
  reason?: string;
}

export interface InspectionResult {
  facility_id: string;
  trap_id: string;
  detections: Detection[];
  pest_count: number;
  threshold_exceeded: boolean;
  work_order: {
    type: string;
    priority: "normal" | "high";
    facility_id: string;
    trap_id: string;
    reason: string;
    work_order_id?: string;
  } | null;
  model_version: string;
}

export interface AuditEvent {
  event_id: number;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  created_at: string;
}

export interface FacilityInfo {
  id: string;
  name: string;
  zone: string;
  traps: string[];
  rule: AlertRule | null;
  workOrdersCount: number;
}
