export type CoachDashboardProfile = {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatar: string | null;
  brandName: string;
  roomId: string;
  roomName: string;
};

export type CoachDashboardMetric = {
  monthlyRevenue: number;
  paidOrderRate: number;
  revenueBreakdown: Array<{
    label: string;
    value: number;
    share: number;
  }>;
  clientOverviewTrend: number[];
  activeMembers: number;
  averageActiveMembers: number;
  maxActiveMembers: number;
  plansMonth: number;
  plansWeek: number;
  plansToday: number;
  pendingJoins: number;
};

export type CoachDashboardClient = {
  id: string;
  name: string;
  initials: string;
  status: "active" | "inactive";
  dateJoined: string;
  expireDate: string;
  age: string;
  weight: string;
  lastSeen: string;
  profileCompleteness: number;
  email: string | null;
};

export type CoachDashboardStoreItem = {
  id: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  type: string;
  image: string | null;
};

export type CoachDashboardResponse = {
  profile: CoachDashboardProfile;
  metrics: CoachDashboardMetric;
  clients: CoachDashboardClient[];
  store: CoachDashboardStoreItem[];
};
