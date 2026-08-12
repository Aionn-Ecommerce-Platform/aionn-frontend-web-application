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

interface CreateAgentIdentityRequest {
  name: string;
}

interface UpdateAgentPermissionsRequest {
  permissions: string[];
}

export const agentIdentityService = {
  list() {
    return api.get<AgentIdentityResponse[]>("/agent-identities");
  },
  get(agentId: string) {
    return api.get<AgentIdentityResponse>(`/agent-identities/${agentId}`);
  },
  create(body: CreateAgentIdentityRequest) {
    return api.post<AgentIdentityResponse>("/agent-identities", body, {
      idempotent: true,
    });
  },
  updatePermissions(agentId: string, body: UpdateAgentPermissionsRequest) {
    return api.put<AgentIdentityResponse>(
      `/agent-identities/${agentId}/permissions`,
      body,
    );
  },
  suspend(agentId: string) {
    return api.post<AgentIdentityResponse>(
      `/agent-identities/${agentId}/suspend`,
    );
  },
  auditLogs(agentId: string) {
    return api.get<AgentAuditLogResponse[]>(
      `/agent-identities/${agentId}/audit-logs`,
    );
  },
  revoke(agentId: string) {
    return api.delete<void>(`/agent-identities/${agentId}`);
  },
};
