import {
  ARTBOARD_HEIGHT,
  ARTBOARD_WIDTH,
  DEFAULT_LAYER_STYLE,
  type BuilderKind,
  type BuilderLayer,
  type BuilderLayerStyle,
  type BuilderPage
} from "./builder-types";

export type RueTheme = "midnight" | "electric" | "sand" | "forest" | "slate";
export type RueBlockType = "list" | "table" | "text" | "callout";

export type RueBlock = {
  type: RueBlockType;
  title: string;
  body: string;
  items: string[];
  rows: string[][];
};

export type RuePage = {
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  blocks: RueBlock[];
};

export type RuePlan = {
  message: string;
  title: string;
  description: string;
  kind: BuilderKind;
  theme: RueTheme;
  coverNote: string;
  pages: RuePage[];
};

export const RUE_RESPONSE_SCHEMA = {
  name: "heimdallfit_rue_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["message", "title", "description", "kind", "theme", "coverNote", "pages"],
    properties: {
      message: { type: "string", maxLength: 420 },
      title: { type: "string", maxLength: 120 },
      description: { type: "string", maxLength: 360 },
      kind: { type: "string", enum: ["onboarding_form", "diet_plan", "training_plan"] },
      theme: { type: "string", enum: ["midnight", "electric", "sand", "forest", "slate"] },
      coverNote: { type: "string", maxLength: 600 },
      pages: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "eyebrow", "title", "subtitle", "blocks"],
          properties: {
            name: { type: "string", maxLength: 60 },
            eyebrow: { type: "string", maxLength: 60 },
            title: { type: "string", maxLength: 100 },
            subtitle: { type: "string", maxLength: 240 },
            blocks: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["type", "title", "body", "items", "rows"],
                properties: {
                  type: { type: "string", enum: ["list", "table", "text", "callout"] },
                  title: { type: "string", maxLength: 80 },
                  body: { type: "string", maxLength: 650 },
                  items: { type: "array", maxItems: 8, items: { type: "string", maxLength: 180 } },
                  rows: {
                    type: "array",
                    maxItems: 8,
                    items: { type: "array", minItems: 2, maxItems: 6, items: { type: "string", maxLength: 120 } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

const palettes: Record<RueTheme, {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}> = {
  midnight: { background: "#0c111b", surface: "#151c29", surfaceAlt: "#1d2737", text: "#f8fafc", muted: "#a6b1c2", accent: "#7c6cff", border: "#2a374b" },
  electric: { background: "#f4f7ff", surface: "#ffffff", surfaceAlt: "#eaf0ff", text: "#10203b", muted: "#66748d", accent: "#2563eb", border: "#d8e1f2" },
  sand: { background: "#f5f0e8", surface: "#fffdf9", surfaceAlt: "#eee4d6", text: "#2f2923", muted: "#74695e", accent: "#c46d3b", border: "#dfd3c4" },
  forest: { background: "#0e1a17", surface: "#172622", surfaceAlt: "#20352f", text: "#f2fbf7", muted: "#a6bdb4", accent: "#35c78b", border: "#315047" },
  slate: { background: "#f5f6f8", surface: "#ffffff", surfaceAlt: "#e9edf2", text: "#172033", muted: "#69758a", accent: "#596780", border: "#dce1e8" }
};

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function style(overrides: Partial<BuilderLayerStyle> = {}): BuilderLayerStyle {
  return { ...DEFAULT_LAYER_STYLE, ...overrides };
}

function layer(
  type: BuilderLayer["type"],
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<BuilderLayer> = {}
): BuilderLayer {
  return {
    id: randomId("layer"),
    type,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    text: "",
    items: [],
    rows: [],
    imageUrl: null,
    imagePath: null,
    style: style(),
    ...overrides
  };
}

function blockWeight(type: RueBlockType) {
  if (type === "table") return 3.2;
  if (type === "list") return 2.6;
  if (type === "text") return 1.8;
  return 1.55;
}

function maxBlockHeight(type: RueBlockType) {
  if (type === "table") return 390;
  if (type === "list") return 330;
  if (type === "text") return 250;
  return 210;
}

function composeBlock(block: RueBlock, index: number, y: number, height: number, palette: (typeof palettes)[RueTheme]) {
  const layers: BuilderLayer[] = [];
  const isCallout = block.type === "callout";
  const surface = isCallout ? palette.accent : index % 2 === 0 ? palette.surface : palette.surfaceAlt;
  const textColor = isCallout ? "#ffffff" : palette.text;
  const mutedColor = isCallout ? "#ffffff" : palette.muted;

  layers.push(layer("shape", `${block.title} card`, 52, y, 716, height, {
    style: style({ backgroundColor: surface, borderColor: isCallout ? palette.accent : palette.border, borderWidth: 1, borderRadius: 24, padding: 0 })
  }));
  layers.push(layer("text", `${block.title} heading`, 76, y + 20, 660, 34, {
    text: block.title,
    style: style({ fontFamily: "Clash Display", fontSize: 22, fontWeight: 650, lineHeight: 1.1, color: textColor, padding: 0 })
  }));

  const contentY = y + 62;
  const contentHeight = Math.max(64, height - 78);
  if (block.type === "table") {
    layers.push(layer("table", block.title, 70, contentY, 680, contentHeight, {
      rows: block.rows.length ? block.rows : [["Detail", "Guidance"], [block.title, block.body]],
      style: style({ fontSize: 13, fontWeight: 500, lineHeight: 1.2, color: textColor, backgroundColor: "transparent", borderColor: mutedColor, borderWidth: 0, borderRadius: 0, padding: 4 })
    }));
  } else if (block.type === "list") {
    layers.push(layer("checklist", block.title, 70, contentY, 680, contentHeight, {
      items: block.items.length ? block.items : [block.body],
      style: style({ fontSize: 15, fontWeight: 500, lineHeight: 1.25, color: textColor, backgroundColor: "transparent", borderColor: isCallout ? "#ffffff" : palette.accent, borderWidth: 0, borderRadius: 0, padding: 8 })
    }));
  } else {
    layers.push(layer("text", `${block.title} copy`, 76, contentY, 660, contentHeight, {
      text: block.body || block.items.join("\n"),
      style: style({ fontSize: isCallout ? 17 : 15, fontWeight: isCallout ? 600 : 450, lineHeight: 1.45, color: textColor, padding: 0 })
    }));
  }

  return layers;
}

export function composeRuePages(plan: RuePlan): BuilderPage[] {
  const palette = palettes[plan.theme] || palettes.midnight;

  return plan.pages.slice(0, 5).map((page, pageIndex) => {
    const blocks = page.blocks.slice(0, 3);
    const gap = 18;
    const startY = 306;
    const endY = 984;
    const available = endY - startY - gap * Math.max(0, blocks.length - 1);
    const totalWeight = blocks.reduce((total, block) => total + blockWeight(block.type), 0) || 1;
    let y = startY;

    const layers: BuilderLayer[] = [
      layer("shape", "Accent rail", 0, 0, 18, ARTBOARD_HEIGHT, { style: style({ backgroundColor: palette.accent, borderRadius: 0, padding: 0 }) }),
      layer("text", "Eyebrow", 58, 48, 690, 24, {
        text: page.eyebrow.toUpperCase(),
        style: style({ fontSize: 12, fontWeight: 700, lineHeight: 1, letterSpacing: 2.4, color: palette.accent, padding: 0 })
      }),
      layer("text", "Page title", 56, 88, 700, 104, {
        text: page.title,
        style: style({ fontFamily: "Clash Display", fontSize: 48, fontWeight: 700, lineHeight: 0.98, letterSpacing: -1.2, color: palette.text, padding: 0 })
      }),
      layer("text", "Page introduction", 58, 205, 680, 64, {
        text: page.subtitle,
        style: style({ fontSize: 17, fontWeight: 450, lineHeight: 1.4, color: palette.muted, padding: 0 })
      })
    ];

    blocks.forEach((block, blockIndex) => {
      const remaining = endY - y;
      const weightedHeight = Math.round(available * (blockWeight(block.type) / totalWeight));
      const height = Math.min(remaining, maxBlockHeight(block.type), weightedHeight);
      layers.push(...composeBlock(block, blockIndex, y, height, palette));
      y += height + gap;
    });

    layers.push(layer("text", "Page number", 704, 1015, 58, 20, {
      text: String(pageIndex + 1).padStart(2, "0"),
      style: style({ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 600, textAlign: "right", color: palette.muted, padding: 0 })
    }));

    return {
      id: randomId("page"),
      name: page.name || `Page ${pageIndex + 1}`,
      width: ARTBOARD_WIDTH,
      height: ARTBOARD_HEIGHT,
      background: palette.background,
      layers
    };
  });
}

export function parseRuePlan(content: string): RuePlan {
  const parsed = JSON.parse(content) as Partial<RuePlan>;
  if (
    !parsed ||
    typeof parsed.message !== "string" ||
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string" ||
    !["onboarding_form", "diet_plan", "training_plan"].includes(String(parsed.kind)) ||
    !["midnight", "electric", "sand", "forest", "slate"].includes(String(parsed.theme)) ||
    typeof parsed.coverNote !== "string" ||
    !Array.isArray(parsed.pages) ||
    parsed.pages.length === 0
  ) {
    throw new Error("Rue returned an incomplete plan.");
  }
  return parsed as RuePlan;
}
