export type BusinessMemberRole =
  | "OWNER"
  | "ADMIN"
  | "DEVELOPER"
  | "VIEWER";

export type BusinessMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "INACTIVE";

export interface BusinessMember {
  id: string;

  name: string;
  initials: string;
  email: string;

  role: BusinessMemberRole;
  status: BusinessMemberStatus;

  requestCount: number;
  requestShare: number;

  fallbackRate: number;
  avgLatencyMs: number;

  apiKeys: string[];

  lastActiveAt?: string;
  joinedAt?: string;
}

export interface MemberMetric {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}

export interface RolePermission {
  role: BusinessMemberRole;
  description: string;

  permissions: string[];
}

export const memberMetrics: MemberMetric[] = [
  {
    label: "Members",
    value: "12",
    detail: "people with organization access",
  },
  {
    label: "Active",
    value: "10",
    detail: "members active in the last 30 days",
    accent: true,
  },
  {
    label: "Developers",
    value: "7",
    detail: "members generating application traffic",
  },
  {
    label: "Pending invites",
    value: "2",
    detail: "invitations awaiting acceptance",
  },
];

export const businessMembers: BusinessMember[] = [
  {
    id: "member_hasnain",

    name: "Hasnain Ali",
    initials: "HA",
    email: "hasnain@acme.example",

    role: "OWNER",
    status: "ACTIVE",

    requestCount: 4210,
    requestShare: 32.8,

    fallbackRate: 5.4,
    avgLatencyMs: 1248,

    apiKeys: [
      "Production API",
      "Developer API",
    ],

    lastActiveAt:
      "2026-08-31T11:28:00.000Z",

    joinedAt:
      "2026-07-12T09:00:00.000Z",
  },

  {
    id: "member_sara",

    name: "Sara Khan",
    initials: "SK",
    email: "sara@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 3184,
    requestShare: 24.8,

    fallbackRate: 4.8,
    avgLatencyMs: 1382,

    apiKeys: ["Backend service"],

    lastActiveAt:
      "2026-08-31T10:54:00.000Z",

    joinedAt:
      "2026-07-18T11:00:00.000Z",
  },

  {
    id: "member_ahmed",

    name: "Ahmed Raza",
    initials: "AR",
    email: "ahmed@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 2542,
    requestShare: 19.8,

    fallbackRate: 6.1,
    avgLatencyMs: 1094,

    apiKeys: ["Internal tools"],

    lastActiveAt:
      "2026-08-31T10:31:00.000Z",

    joinedAt:
      "2026-07-21T08:30:00.000Z",
  },

  {
    id: "member_hamza",

    name: "Hamza Noor",
    initials: "HN",
    email: "hamza@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 1748,
    requestShare: 13.6,

    fallbackRate: 7.2,
    avgLatencyMs: 1438,

    apiKeys: ["Data pipeline"],

    lastActiveAt:
      "2026-08-31T09:47:00.000Z",

    joinedAt:
      "2026-07-26T10:15:00.000Z",
  },

  {
    id: "member_mariam",

    name: "Mariam Siddiqui",
    initials: "MS",
    email: "mariam@acme.example",

    role: "ADMIN",
    status: "ACTIVE",

    requestCount: 487,
    requestShare: 3.8,

    fallbackRate: 4.2,
    avgLatencyMs: 1162,

    apiKeys: ["Operations API"],

    lastActiveAt:
      "2026-08-30T17:14:00.000Z",

    joinedAt:
      "2026-08-02T12:00:00.000Z",
  },

  {
    id: "member_usman",

    name: "Usman Tariq",
    initials: "UT",
    email: "usman@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 276,
    requestShare: 2.1,

    fallbackRate: 5.7,
    avgLatencyMs: 986,

    apiKeys: ["Developer API"],

    lastActiveAt:
      "2026-08-30T13:08:00.000Z",

    joinedAt:
      "2026-08-05T09:45:00.000Z",
  },

  {
    id: "member_zain",

    name: "Zain Ahmed",
    initials: "ZA",
    email: "zain@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 173,
    requestShare: 1.3,

    fallbackRate: 3.9,
    avgLatencyMs: 1024,

    apiKeys: ["Developer API"],

    lastActiveAt:
      "2026-08-29T19:12:00.000Z",

    joinedAt:
      "2026-08-07T10:00:00.000Z",
  },

  {
    id: "member_ayesha",

    name: "Ayesha Malik",
    initials: "AM",
    email: "ayesha@acme.example",

    role: "VIEWER",
    status: "ACTIVE",

    requestCount: 94,
    requestShare: 0.7,

    fallbackRate: 4.1,
    avgLatencyMs: 1184,

    apiKeys: [],

    lastActiveAt:
      "2026-08-29T15:42:00.000Z",

    joinedAt:
      "2026-08-08T14:00:00.000Z",
  },

  {
    id: "member_bilal",

    name: "Bilal Khan",
    initials: "BK",
    email: "bilal@acme.example",

    role: "DEVELOPER",
    status: "ACTIVE",

    requestCount: 74,
    requestShare: 0.6,

    fallbackRate: 6.4,
    avgLatencyMs: 1328,

    apiKeys: ["Sandbox API"],

    lastActiveAt:
      "2026-08-28T18:20:00.000Z",

    joinedAt:
      "2026-08-11T09:00:00.000Z",
  },

  {
    id: "member_fatima",

    name: "Fatima Ali",
    initials: "FA",
    email: "fatima@acme.example",

    role: "VIEWER",
    status: "INACTIVE",

    requestCount: 54,
    requestShare: 0.4,

    fallbackRate: 5.6,
    avgLatencyMs: 1210,

    apiKeys: [],

    lastActiveAt:
      "2026-08-19T12:31:00.000Z",

    joinedAt:
      "2026-08-12T11:30:00.000Z",
  },

  {
    id: "member_invite_01",

    name: "Nadia Shah",
    initials: "NS",
    email: "nadia@acme.example",

    role: "DEVELOPER",
    status: "INVITED",

    requestCount: 0,
    requestShare: 0,

    fallbackRate: 0,
    avgLatencyMs: 0,

    apiKeys: [],
  },

  {
    id: "member_invite_02",

    name: "Omar Farooq",
    initials: "OF",
    email: "omar@acme.example",

    role: "VIEWER",
    status: "INVITED",

    requestCount: 0,
    requestShare: 0,

    fallbackRate: 0,
    avgLatencyMs: 0,

    apiKeys: [],
  },
];

export const rolePermissions: RolePermission[] = [
  {
    role: "OWNER",

    description:
      "Full control over the organization and its Attentra workspace.",

    permissions: [
      "Manage organization",
      "Manage members",
      "Manage API keys",
      "View routing activity",
      "View model intelligence",
      "Change workspace settings",
    ],
  },

  {
    role: "ADMIN",

    description:
      "Operational access for managing members and workspace resources.",

    permissions: [
      "Manage members",
      "Manage API keys",
      "View routing activity",
      "View model intelligence",
      "Change workspace settings",
    ],
  },

  {
    role: "DEVELOPER",

    description:
      "Developer access for integrating applications and reviewing routing activity.",

    permissions: [
      "Use organization API keys",
      "View requests",
      "View routing activity",
      "View model intelligence",
    ],
  },

  {
    role: "VIEWER",

    description:
      "Read-only visibility into organization activity.",

    permissions: [
      "View requests",
      "View routing activity",
      "View model intelligence",
    ],
  },
];