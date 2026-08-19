export type BuilderKind = "onboarding_form" | "diet_plan" | "training_plan";

export type BuilderLayerType = "text" | "checklist" | "table" | "image" | "shape";

export type BuilderLayerStyle = {
  fontFamily: "Inter" | "Clash Display" | "Georgia" | "JetBrains Mono";
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: "left" | "center" | "right";
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  objectFit: "cover" | "contain";
};

export type BuilderLayer = {
  id: string;
  type: BuilderLayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  text: string;
  items: string[];
  rows: string[][];
  imageUrl: string | null;
  imagePath: string | null;
  style: BuilderLayerStyle;
};

export type BuilderPage = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  layers: BuilderLayer[];
};

export type LegacyBuilderSection = {
  id: string;
  title: string;
  items: string[];
  type?: "text" | "image";
  imageUrl?: string | null;
  imagePath?: string | null;
  imageCaption?: string;
  span?: 1 | 2;
  height?: "sm" | "md" | "lg";
};

export type BuilderContent = {
  version: 2;
  coverNote: string;
  pages: BuilderPage[];
  sections: LegacyBuilderSection[];
};

export type BuilderDocument = {
  id: string;
  title: string;
  description: string;
  kind: BuilderKind;
  theme: string;
  status: string;
  clientId: string | null;
  clientName: string | null;
  updatedAt: string;
  content: BuilderContent;
};

export type BuilderClient = {
  id: string;
  name: string;
  email: string | null;
  status: string;
};

export type BuilderStudioResponse = {
  clients: BuilderClient[];
  documents: BuilderDocument[];
};

export const ARTBOARD_WIDTH = 820;
export const ARTBOARD_HEIGHT = 1060;

export const DEFAULT_LAYER_STYLE: BuilderLayerStyle = {
  fontFamily: "Inter",
  fontSize: 22,
  fontWeight: 500,
  lineHeight: 1.35,
  letterSpacing: 0,
  textAlign: "left",
  color: "#152033",
  backgroundColor: "transparent",
  borderColor: "transparent",
  borderWidth: 0,
  borderRadius: 18,
  padding: 16,
  objectFit: "cover"
};
