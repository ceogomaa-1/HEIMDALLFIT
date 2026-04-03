import { combatTemplates } from "@heimdallfit/config";
import type { CoachRoom, PendingClient, PhotoAnnotation, ProgressPhoto, StoreProduct } from "@heimdallfit/types";

export const coachRoom: CoachRoom = {
  coachId: "coach_demo_01",
  roomId: "STORM888",
  roomName: "Heimdall Storm Room",
  brandTagline: "Luxury infrastructure for elite combat athletes."
};

export const coachProfile = {
  name: "Jackson Carter",
  handle: "@jacksoncarterfit",
  role: "Elite Performance Coach",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80"
};

export const coachAnalytics = [
  { label: "Active Clients", value: "24", icon: "users" },
  { label: "Revenue (MTD)", value: "$8.5k", icon: "money" },
  { label: "Adherence Rate", value: "89%", icon: "checklist" },
  { label: "Sessions Today", value: "12", icon: "calendar" }
] as const;

export const coachTrend = [4500, 5200, 6100, 5850, 7200, 8600];
export const coachWeeklyAdherence = [86, 94, 89, 97, 92, 88, 95];

export const coachClients = [
  {
    initials: "MC",
    name: "Marcus Chen",
    sessions: 12,
    progress: 87,
    status: "active",
    lastSeen: "2 hours ago",
    dateJoined: "Mar 04, 2026",
    expireDate: "Apr 04, 2026",
    age: 29,
    weight: "178 lb"
  },
  {
    initials: "SW",
    name: "Sarah Williams",
    sessions: 18,
    progress: 92,
    status: "active",
    lastSeen: "30 mins ago",
    dateJoined: "Feb 26, 2026",
    expireDate: "Apr 26, 2026",
    age: 31,
    weight: "142 lb"
  },
  {
    initials: "DT",
    name: "David Torres",
    sessions: 8,
    progress: 68,
    status: "inactive",
    lastSeen: "1 day ago",
    dateJoined: "Mar 10, 2026",
    expireDate: "Mar 30, 2026",
    age: 27,
    weight: "191 lb"
  },
  {
    initials: "ER",
    name: "Elena Rodriguez",
    sessions: 24,
    progress: 95,
    status: "active",
    lastSeen: "5 mins ago",
    dateJoined: "Jan 12, 2026",
    expireDate: "Apr 12, 2026",
    age: 25,
    weight: "132 lb"
  },
  {
    initials: "JM",
    name: "James Mitchell",
    sessions: 15,
    progress: 73,
    status: "active",
    lastSeen: "4 hours ago",
    dateJoined: "Feb 03, 2026",
    expireDate: "Apr 03, 2026",
    age: 34,
    weight: "205 lb"
  },
  {
    initials: "PP",
    name: "Priya Patel",
    sessions: 20,
    progress: 89,
    status: "active",
    lastSeen: "1 hour ago",
    dateJoined: "Jan 25, 2026",
    expireDate: "Apr 25, 2026",
    age: 28,
    weight: "138 lb"
  }
] as const;

export const pendingClients: PendingClient[] = [
  {
    id: "pending_1",
    coachId: "coach_demo_01",
    status: "pending",
    goals: "Drop 5 lbs and sharpen boxing pace",
    injuries: "Mild shoulder tightness",
    createdAt: "2026-03-28T09:15:00Z"
  },
  {
    id: "pending_2",
    coachId: "coach_demo_01",
    status: "pending",
    goals: "Prepare for MMA amateur debut",
    injuries: "None",
    createdAt: "2026-03-28T10:05:00Z"
  }
];

export const revenue = {
  monthly: 12840,
  subscriptions: 76,
  storeSales: 4280
};

export const migrationPreview = [
  { name: "Maya Chen", channel: "SMS", status: "Ready" },
  { name: "Jordan Silva", channel: "Email", status: "Ready" },
  { name: "Reece Turner", channel: "SMS", status: "Duplicate protected" }
];

export const products: StoreProduct[] = [
  {
    id: "prod_1",
    coachId: "coach_demo_01",
    title: "8 Week Fight Camp Blueprint",
    price: 149,
    type: "program",
    description: "Boxing, conditioning, and daily recovery structure for competition prep."
  },
  {
    id: "prod_2",
    coachId: "coach_demo_01",
    title: "Weight Cut Mastery",
    price: 39,
    type: "ebook",
    description: "Coach-built hydration, sodium, and taper guidance."
  }
];

export const storePreview = [
  {
    id: "store_1",
    title: "8 Week Fight Camp",
    subtitle: "Boxing conditioning system",
    price: "$149",
    image:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "store_2",
    title: "Weight Cut Mastery",
    subtitle: "Hydration and taper guide",
    price: "$39",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "store_3",
    title: "Recovery Stack",
    subtitle: "Mobility and sleep toolkit",
    price: "$59",
    image:
      "https://images.unsplash.com/photo-1517837016564-bfc4f7a5c1f0?auto=format&fit=crop&w=900&q=80"
  }
] as const;

export const coachStatusCards = [
  { label: "Active Members", value: "24", meta: "Across all active plans" },
  { label: "Plans Made", value: "18 / 6 / 2", meta: "Month / Week / Today" },
  { label: "Today", value: "Mar 30, 2026", meta: "9:24 PM Toronto" }
] as const;

export const photo: ProgressPhoto = {
  id: "photo_1",
  clientId: "client_1",
  originalUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  processedUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  status: "ready"
};

export const annotations: PhotoAnnotation[] = [
  { id: "ann_1", photoId: "photo_1", kind: "circle", x: 28, y: 28, width: 26, height: 18, color: "#00A3FF" },
  { id: "ann_2", photoId: "photo_1", kind: "arrow", x: 55, y: 35, width: 18, height: 12, color: "#FF5C8A" },
  { id: "ann_3", photoId: "photo_1", kind: "text", x: 58, y: 52, label: "Rear delt lagging. Add high-rep finishers.", color: "#FFFFFF" }
];

export { combatTemplates };
