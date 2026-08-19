"use client";

import { ImagePlus, LockKeyhole } from "lucide-react";
import { Rnd } from "react-rnd";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { BuilderLayer, BuilderPage } from "../../lib/builder-types";

function snap(value: number, enabled: boolean) {
  return enabled ? Math.round(value / 8) * 8 : Math.round(value);
}

function fontFamily(layer: BuilderLayer) {
  if (layer.style.fontFamily === "Clash Display") return '"Clash Display", sans-serif';
  if (layer.style.fontFamily === "Georgia") return "Georgia, serif";
  if (layer.style.fontFamily === "JetBrains Mono") return '"JetBrains Mono", monospace';
  return '"Inter", sans-serif';
}

function editableKeyDown(event: KeyboardEvent<HTMLElement>) {
  event.stopPropagation();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") return;
  if (event.key === "Escape") event.currentTarget.blur();
}

function LayerContent({ layer, selected, onChange, onUpload }: { layer: BuilderLayer; selected: boolean; onChange: (patch: Partial<BuilderLayer>) => void; onUpload: () => void }) {
  const contentStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    fontFamily: fontFamily(layer),
    fontSize: layer.style.fontSize,
    fontWeight: layer.style.fontWeight,
    lineHeight: layer.style.lineHeight,
    letterSpacing: layer.style.letterSpacing,
    textAlign: layer.style.textAlign,
    color: layer.style.color,
    background: layer.style.backgroundColor,
    border: `${layer.style.borderWidth}px solid ${layer.style.borderColor}`,
    borderRadius: layer.style.borderRadius,
    padding: layer.style.padding,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: "center"
  };

  if (layer.type === "shape") return <div style={contentStyle} />;

  if (layer.type === "image") {
    return (
      <div style={{ ...contentStyle, padding: 0, position: "relative" }}>
        {layer.imageUrl ? <img src={layer.imageUrl} alt={layer.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: layer.style.objectFit, display: "block" }} /> : (
          <button type="button" onClick={(event) => { event.stopPropagation(); onUpload(); }} className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#eef1f7] text-[#7b8497]">
            <ImagePlus className="h-7 w-7" /><span className="text-sm font-semibold">Add image</span>
          </button>
        )}
        {layer.text ? <div className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3 text-sm text-white backdrop-blur-sm">{layer.text}</div> : null}
      </div>
    );
  }

  if (layer.type === "table") {
    return (
      <div style={contentStyle}>
        <table className="h-full w-full table-fixed border-collapse">
          <tbody>
            {layer.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border-b border-current/10 px-2 py-1.5 align-middle" style={{ fontWeight: rowIndex === 0 ? 700 : layer.style.fontWeight }}>{cell}</td>
            ))}</tr>)}
          </tbody>
        </table>
      </div>
    );
  }

  if (layer.type === "checklist") {
    return (
      <div style={contentStyle} className="flex flex-col justify-center gap-2">
        {layer.items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <span className="mt-[0.58em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: layer.style.borderColor === "transparent" ? layer.style.color : layer.style.borderColor }} />
            <span
              className="builder-inline-edit min-w-0 flex-1 outline-none"
              contentEditable={selected && !layer.locked}
              suppressContentEditableWarning
              onBlur={(event) => onChange({ items: layer.items.map((value, itemIndex) => itemIndex === index ? event.currentTarget.innerText : value) })}
              onKeyDown={editableKeyDown}
            >{item}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="builder-inline-edit whitespace-pre-wrap outline-none"
      style={contentStyle}
      contentEditable={selected && !layer.locked}
      suppressContentEditableWarning
      onBlur={(event) => onChange({ text: event.currentTarget.innerText })}
      onKeyDown={editableKeyDown}
    >{layer.text}</div>
  );
}

export function BuilderCanvas({
  page,
  scale,
  selectedLayerId,
  snapToGrid,
  onSelect,
  onChangeLayer,
  onUpload
}: {
  page: BuilderPage;
  scale: number;
  selectedLayerId: string | null;
  snapToGrid: boolean;
  onSelect: (id: string | null) => void;
  onChangeLayer: (id: string, patch: Partial<BuilderLayer>) => void;
  onUpload: (id: string) => void;
}) {
  return (
    <div className="builder-artboard-frame" style={{ width: page.width * scale, height: page.height * scale }}>
      <div
        className="builder-artboard"
        style={{ width: page.width, height: page.height, background: page.background, transform: `scale(${scale})`, transformOrigin: "top left" }}
        onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}
      >
        {page.layers.map((layer, index) => {
          if (layer.hidden) return null;
          const selected = selectedLayerId === layer.id;
          return (
            <Rnd
              key={layer.id}
              bounds="parent"
              scale={scale}
              position={{ x: layer.x, y: layer.y }}
              size={{ width: layer.width, height: layer.height }}
              disableDragging={layer.locked}
              enableResizing={selected && !layer.locked}
              cancel=".builder-inline-edit,button,input,textarea"
              onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => { event.stopPropagation(); onSelect(layer.id); }}
              onDragStop={(_, data) => onChangeLayer(layer.id, { x: snap(data.x, snapToGrid), y: snap(data.y, snapToGrid) })}
              onResizeStop={(_, __, ref, ___, position) => onChangeLayer(layer.id, {
                x: snap(position.x, snapToGrid),
                y: snap(position.y, snapToGrid),
                width: snap(ref.offsetWidth, snapToGrid),
                height: snap(ref.offsetHeight, snapToGrid)
              })}
              resizeHandleClasses={{
                topLeft: "builder-resize-handle builder-resize-nw",
                topRight: "builder-resize-handle builder-resize-ne",
                bottomLeft: "builder-resize-handle builder-resize-sw",
                bottomRight: "builder-resize-handle builder-resize-se"
              }}
              className={selected ? "builder-layer-selected" : "builder-layer"}
              style={{ zIndex: index + 1 }}
            >
              <LayerContent layer={layer} selected={selected} onChange={(patch) => onChangeLayer(layer.id, patch)} onUpload={() => onUpload(layer.id)} />
              {layer.locked ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><LockKeyhole className="h-3 w-3" /></span> : null}
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
