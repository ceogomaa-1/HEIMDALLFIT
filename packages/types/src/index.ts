export type ProfileRole = "coach" | "client" | "admin";
export type ClientStatus = "pending" | "active" | "archived";
export type ProductType = "ebook" | "merch" | "program";
export type AnnotationKind = "arrow" | "circle" | "text";

export interface Profile {
  id: string;
  role: ProfileRole;
  fullName: string;
  avatarUrl?: string | null;
  pushToken?: string | null;
}

export interface CoachRoom {
  coachId: string;
  roomId: string;
  roomName: string;
  brandTagline: string;
}

export interface OnboardingSurveyPayload {
  roomId: string;
  age: number;
  weight: number;
  injuries: string;
  goals: string;
}

export interface PendingClient {
  id: string;
  coachId: string;
  status: ClientStatus;
  goals: string;
  injuries: string;
  createdAt: string;
}

export interface MigrationContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export interface InvitePayload {
  coachId: string;
  contacts: MigrationContact[];
}

export interface ProgressPhoto {
  id: string;
  clientId: string;
  originalUrl: string;
  processedUrl?: string | null;
  status: "queued" | "processing" | "ready" | "failed";
}

export interface PhotoAnnotation {
  id: string;
  photoId: string;
  kind: AnnotationKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color?: string;
}

export interface CombatRoundConfig {
  rounds: number;
  roundSeconds: number;
  restSeconds: number;
}

export interface StoreProduct {
  id: string;
  coachId: string;
  title: string;
  price: number;
  type: ProductType;
  description: string;
}

export function normalizeRoomId(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase().slice(0, 8);
}

export function isValidRoomId(input: string): boolean {
  return /^[A-Z0-9]{8}$/.test(normalizeRoomId(input));
}

export function calculateCombatDuration(config: CombatRoundConfig): number {
  if (config.rounds <= 0) return 0;
  return config.rounds * config.roundSeconds + Math.max(config.rounds - 1, 0) * config.restSeconds;
}
