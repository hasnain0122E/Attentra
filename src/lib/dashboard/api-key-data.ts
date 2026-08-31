export type ApiKeyStatus =
  | "ACTIVE"
  | "REVOKED";

export interface DashboardApiKey {
  id: string;
  name: string;

  prefix: string;
  maskedKey: string;

  status: ApiKeyStatus;

  createdAt: string;
  lastUsedAt?: string;

  requestCount: number;
}

export const initialApiKeys: DashboardApiKey[] = [
  {
    id: "key_consumer_primary",
    name: "Primary development",
    prefix: "attentra_demo_7K2M",
    maskedKey:
      "attentra_demo_7K2M••••••••••••••••••••",
    status: "ACTIVE",
    createdAt: "2026-08-28T10:30:00.000Z",
    lastUsedAt: "2026-08-31T10:42:00.000Z",
    requestCount: 128,
  },

  {
    id: "key_local_testing",
    name: "Local testing",
    prefix: "attentra_demo_4P9X",
    maskedKey:
      "attentra_demo_4P9X••••••••••••••••••••",
    status: "ACTIVE",
    createdAt: "2026-08-25T14:15:00.000Z",
    lastUsedAt: "2026-08-30T16:31:00.000Z",
    requestCount: 46,
  },

  {
    id: "key_old_experiment",
    name: "Old experiment",
    prefix: "attentra_demo_2Q8R",
    maskedKey:
      "attentra_demo_2Q8R••••••••••••••••••••",
    status: "REVOKED",
    createdAt: "2026-08-21T09:00:00.000Z",
    lastUsedAt: "2026-08-23T18:22:00.000Z",
    requestCount: 19,
  },
];