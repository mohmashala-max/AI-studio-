import { AlertRule, AuditEvent, WorkOrder } from "./models";

export class AlertRuleStore {
  private alertRules = new Map<string, AlertRule>();
  private auditEvents: AuditEvent[] = [];
  private workOrders = new Map<string, WorkOrder>();
  private nextEventId = 1;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Seed default alert rules
    this.alertRules.set("facility-1", {
      facility_id: "facility-1",
      pest_type: "any",
      threshold: 3,
      cooldown_minutes: 60,
      enabled: true,
    });
    this.alertRules.set("facility-demo", {
      facility_id: "facility-demo",
      pest_type: "cockroach",
      threshold: 5,
      cooldown_minutes: 30,
      enabled: true,
    });
    this.alertRules.set("facility-voice", {
      facility_id: "facility-voice",
      pest_type: "any",
      threshold: 5,
      cooldown_minutes: 60,
      enabled: true,
    });

    // Seed sample work orders
    const seedWo1: WorkOrder = {
      work_order_id: "wo-101-f1-t1",
      facility_id: "facility-1",
      trap_id: "trap-1",
      pest_count: 6,
      priority: "high",
      status: "in_progress",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      reason: "pest count 6 reached threshold 3",
    };
    const seedWo2: WorkOrder = {
      work_order_id: "wo-102-demo-t2",
      facility_id: "facility-demo",
      trap_id: "trap-2",
      pest_count: 4,
      priority: "normal",
      status: "requested",
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      reason: "pest count 4 reached threshold 3",
    };
    this.workOrders.set(seedWo1.work_order_id, seedWo1);
    this.workOrders.set(seedWo2.work_order_id, seedWo2);

    // Seed initial audit events
    this.audit("system", "system.initialized", "system", { message: "M-PAS Platform engine initialized" });
    this.audit("demo", "alert_rule.created_or_updated", "facility-1", { threshold: 3, source: "seed" });
  }

  upsert(rule: AlertRule): AlertRule {
    const updated: AlertRule = {
      facility_id: rule.facility_id,
      pest_type: rule.pest_type || "any",
      threshold: Number(rule.threshold) || 5,
      cooldown_minutes: Number(rule.cooldown_minutes) || 60,
      enabled: rule.enabled ?? true,
    };
    this.alertRules.set(rule.facility_id, updated);
    return updated;
  }

  get(facility_id: string): AlertRule | null {
    return this.alertRules.get(facility_id) || null;
  }

  saveWorkOrder(workOrder: WorkOrder): WorkOrder {
    const existing = this.workOrders.get(workOrder.work_order_id);
    if (!existing) {
      const now = new Date().toISOString();
      const created: WorkOrder = {
        ...workOrder,
        created_at: workOrder.created_at || now,
        updated_at: workOrder.updated_at || now,
      };
      this.workOrders.set(workOrder.work_order_id, created);
      return created;
    }
    return existing;
  }

  listWorkOrders(facility_id: string): WorkOrder[] {
    const list: WorkOrder[] = [];
    for (const wo of this.workOrders.values()) {
      if (wo.facility_id === facility_id) {
        list.push(wo);
      }
    }
    return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }

  updateWorkOrderStatus(work_order_id: string, status: WorkOrder["status"]): WorkOrder | null {
    const wo = this.workOrders.get(work_order_id);
    if (!wo) return null;
    wo.status = status;
    wo.updated_at = new Date().toISOString();
    this.workOrders.set(work_order_id, wo);
    return wo;
  }

  audit(actor: string, action: string, resource: string, details: Record<string, any>): void {
    const event: AuditEvent = {
      event_id: this.nextEventId++,
      actor,
      action,
      resource,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditEvents.unshift(event);
    if (this.auditEvents.length > 200) {
      this.auditEvents.pop();
    }
  }

  listAuditEvents(limit = 100): AuditEvent[] {
    return this.auditEvents.slice(0, limit);
  }
}

export const alertStore = new AlertRuleStore();
