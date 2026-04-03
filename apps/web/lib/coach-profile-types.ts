export type CoachProfileResponse = {
  id: string;
  fullName: string;
  handle: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  bannerPath: string | null;
  bannerUrl: string | null;
  brandName: string;
  specialty: string;
  bio: string;
  roomId: string;
  roomName: string;
  brandTagline: string;
};

export type UpdateCoachProfilePayload = {
  fullName: string;
  avatarPath: string | null;
  bannerPath: string | null;
  brandName: string;
  specialty: string;
  bio: string;
  roomName: string;
  brandTagline: string;
};
