export type UserRole = "admin_executive" | "field_technician" | "facility_manager";
export type AlertLevel = "normal" | "watch" | "warning" | "critical";

export interface Detection {
  label: string; // "lasioderma_serricorne" or "stegobium_paniceum"
  confidence: number;
  area_ratio: number;
  source?: string;
  bbox?: [number, number, number, number]; // [x_pct, y_pct, width_pct, height_pct]
  antennae_type?: "serrate" | "clubbed";
  elytra_texture?: "smooth_pubescent" | "striate_punctate";
}

export interface InspectionRequest {
  facility_id: string;
  trap_id: string;
  image_uri: string;
  detections?: Detection[];
  threshold?: number;
}

export interface ImageUploadResponse {
  image_uri: string;
  content_type: string;
  size_bytes: number;
}

export interface AlertRule {
  facility_id: string;
  pest_type: string;
  threshold: number;
  cooldown_minutes: number;
  enabled: boolean;
  baseline_count?: number;
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
  action_type?: string;
  alert_level?: AlertLevel;
}

export interface InspectionResult {
  facility_id: string;
  trap_id: string;
  detections: Detection[];
  pest_count: number;
  threshold_exceeded: boolean;
  tobacco_beetle_count: number;
  drugstore_beetle_count: number;
  hidden_larval_estimate: number;
  risk_score: number;
  alert_level: AlertLevel;
  work_order: {
    type: string;
    priority: "normal" | "high";
    facility_id: string;
    trap_id: string;
    reason: string;
    work_order_id?: string;
    recommended_action?: string;
  } | null;
  model_version: string;
}

export interface DocumentedAction {
  action_id: string;
  facility_id: string;
  trap_id: string;
  alert_level: AlertLevel;
  risk_score: number;
  trigger_reason: string;
  action_type: "cooling_ventilation" | "dehumidification" | "batch_isolation" | "phosphine_fumigation" | "sample_dissection";
  action_title: string;
  action_details: string;
  logged_at: string;
  logged_by: string;
  follow_up_date: string; // 15-20 days later
  status: "action_logged" | "awaiting_15d_measurement" | "impact_measured_closed";
  pre_action_count: number;
  post_action_count_15d?: number;
  reduction_pct?: number;
  impact_measured_at?: string;
  impact_measurement_notes?: string;
}

export interface AuditEvent {
  event_id: number;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  created_at: string;
}

export interface VoiceCommand {
  user_id: string;
  role: UserRole;
  transcript: string;
  locale?: string;
  facility_id?: string;
  threshold?: number;
}

export interface VoiceCommandResult {
  intent: string;
  response: string;
  action?: Record<string, any>;
}
