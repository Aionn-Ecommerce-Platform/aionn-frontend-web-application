import api from "@/shared/api";

export interface AgentIdentityResponse {
  agentId: string;
  userId: string;
  name: string;
  apiKey: string;
  permissions: string[];
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
}

interface AgentAuditLogResponse {
  logId: string;
  agentId: string;
  action: string;
  details: string | null;
  timestamp: string;
}

interface RawAgentIdentity {
  agentId: string;
  userId?: string;
  name?: string;
  apiKey?: string;
  permissions?: string | string[] | Record<string, unknown> | null;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  createdAt: string;
  updatedAt?: string;
  suspendedAt?: string | null;
}

interface RawAgentAuditLog {
  auditId: string;
  eventType: string | null;
  description: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  timestamp: string;
}

interface CreateAgentIdentityRequest {
  name: string;
}

interface UpdateAgentPermissionsRequest {
  permissions: string[];
}

function normalizePermissions(
  value: RawAgentIdentity["permissions"],
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, enabled]) => {
      if (typeof enabled === "boolean") return enabled ? [key] : [];
      return [`${key}:${String(enabled)}`];
    });
  }
  try {
    return normalizePermissions(JSON.parse(value) as RawAgentIdentity["permissions"]);
  } catch {
    return [value];
  }
}

function normalizeAgent(raw: RawAgentIdentity): AgentIdentityResponse {
  return {
    agentId: raw.agentId,
    userId: raw.userId ?? "",
    name: raw.name?.trim() || `AI Agent ${raw.agentId.slice(-6)}`,
    apiKey: raw.apiKey ?? "",
    permissions: normalizePermissions(raw.permissions),
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    suspendedAt: raw.suspendedAt ?? null,
  };
}

export const agentIdentityService = {
  async list() {
    const rows = await api.get<RawAgentIdentity[]>("/agent-identities");
    return (rows ?? []).map(normalizeAgent);
  },
  async get(agentId: string) {
    return normalizeAgent(await api.get<RawAgentIdentity>(`/agent-identities/${agentId}`));
  },
  async create(body: CreateAgentIdentityRequest) {
    const created = await api.post<RawAgentIdentity>(
      "/agent-identities",
      { agentName: body.name },
      { idempotent: true },
    );
    return normalizeAgent(created);
  },
  async updatePermissions(agentId: string, body: UpdateAgentPermissionsRequest) {
    const updated = await api.put<RawAgentIdentity>(
      `/agent-identities/${agentId}/permissions`,
      { permissionsJson: JSON.stringify(body.permissions) },
    );
    return normalizeAgent(updated);
  },
  async suspend(agentId: string) {
    return normalizeAgent(
      await api.post<RawAgentIdentity>(`/agent-identities/${agentId}/suspend`),
    );
  },
  async auditLogs(agentId: string) {
    const logs = await api.get<RawAgentAuditLog[]>(
      `/agent-identities/${agentId}/audit-logs`,
    );
    return (logs ?? []).map<AgentAuditLogResponse>((log) => ({
      logId: log.auditId,
      agentId,
      action: log.eventType ?? "SECURITY_EVENT",
      details: log.description,
      timestamp: log.timestamp,
    }));
  },
  async revoke(agentId: string) {
    return api.delete<void>(`/agent-identities/${agentId}`);
  },
};
