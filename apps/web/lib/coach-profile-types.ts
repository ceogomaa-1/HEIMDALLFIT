export type CoachProfileGalleryItem = {
  id: string;
  path: string;
  url: string | null;
  caption: string;
};

export type CoachProfileAchievement = {
  id: string;
  title: string;
  issuer: string;
  year: string;
  category: string;
};

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
  gallery: CoachProfileGalleryItem[];
  achievements: CoachProfileAchievement[];
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
  gallery: Array<{
    id: string;
    path: string;
    caption: string;
  }>;
  achievements: CoachProfileAchievement[];
};
