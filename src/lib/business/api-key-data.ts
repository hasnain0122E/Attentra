export type BusinessApiKeyStatus =
  | "ACTIVE"
  | "REVOKED";

export type BusinessApiKeyEnvironment =
  | "PRODUCTION"
  | "DEVELOPMENT"
  | "INTERNAL";

export interface BusinessApiKey {
  id: string;

  name: string;
  prefix: string;

  environment: BusinessApiKeyEnvironment;
  status: BusinessApiKeyStatus;

  createdBy: {
    name: string;
    initials: string;
  };

  requestCount: number;

  lastUsedAt?: string;
  createdAt: string;

  usageContext: string;
}

export interface BusinessApiKeyMetric {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}

export const businessApiKeyMetrics: BusinessApiKeyMetric[] = [
  {
    label: "Organization keys",
    value: "6",
    detail: "shared credentials in this workspace",
  },
  {
    label: "Active",
    value: "5",
    detail: "credentials currently available",
    accent: true,
  },
  {
    label: "Production",
    value: "2",
    detail: "keys serving production workloads",
  },
  {
    label: "Requests",
    value: "12.8K",
    detail: "organization traffic through shared keys",
  },
];

export const businessApiKeys: BusinessApiKey[] = [
  {
    id: "business_key_01",

    name: "Production API",
    prefix: "attentra_demo_ACME01••••",

    environment: "PRODUCTION",
    status: "ACTIVE",

    createdBy: {
      name: "Hasnain Ali",
      initials: "HA",
    },

    requestCount: 4210,

    lastUsedAt: "2026-08-31T11:28:00.000Z",
    createdAt: "2026-07-15T09:00:00.000Z",

    usageContext:
      "Primary production application traffic",
  },

  {
    id: "business_key_02",

    name: "Backend service",
    prefix: "attentra_demo_ACME02••••",

    environment: "PRODUCTION",
    status: "ACTIVE",

    createdBy: {
      name: "Sara Khan",
      initials: "SK",
    },

    requestCount: 3184,

    lastUsedAt: "2026-08-31T10:54:00.000Z",
    createdAt: "2026-07-22T11:30:00.000Z",

    usageContext:
      "Server-side application requests",
  },

  {
    id: "business_key_03",

    name: "Internal tools",
    prefix: "attentra_demo_ACME03••••",

    environment: "INTERNAL",
    status: "ACTIVE",

    createdBy: {
      name: "Ahmed Raza",
      initials: "AR",
    },

    requestCount: 2542,

    lastUsedAt: "2026-08-31T10:31:00.000Z",
    createdAt: "2026-07-29T10:15:00.000Z",

    usageContext:
      "Internal operations and automation tools",
  },

  {
    id: "business_key_04",

    name: "Data pipeline",
    prefix: "attentra_demo_ACME04••••",

    environment: "INTERNAL",
    status: "ACTIVE",

    createdBy: {
      name: "Hamza Noor",
      initials: "HN",
    },

    requestCount: 1748,

    lastUsedAt: "2026-08-31T09:47:00.000Z",
    createdAt: "2026-08-03T08:45:00.000Z",

    usageContext:
      "Data processing and enrichment pipeline",
  },

  {
    id: "business_key_05",

    name: "Developer API",
    prefix: "attentra_demo_ACME05••••",

    environment: "DEVELOPMENT",
    status: "ACTIVE",

    createdBy: {
      name: "Hasnain Ali",
      initials: "HA",
    },

    requestCount: 1058,

    lastUsedAt: "2026-08-30T20:14:00.000Z",
    createdAt: "2026-08-08T13:20:00.000Z",

    usageContext:
      "Shared developer integration environment",
  },

  {
    id: "business_key_06",

    name: "Legacy sandbox",
    prefix: "attentra_demo_ACME06••••",

    environment: "DEVELOPMENT",
    status: "REVOKED",

    createdBy: {
      name: "Mariam Siddiqui",
      initials: "MS",
    },

    requestCount: 100,

    lastUsedAt: "2026-08-18T14:42:00.000Z",
    createdAt: "2026-07-25T12:10:00.000Z",

    usageContext:
      "Previous sandbox integration",
  },
];