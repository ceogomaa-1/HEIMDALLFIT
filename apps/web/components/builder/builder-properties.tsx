"use client";

import { BringToFront, Copy, Eye, EyeOff, ImagePlus, Lock, SendToBack, Trash2, Unlock } from "lucide-react";
import type { BuilderLayer, BuilderPage } from "../../lib/builder-types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-medium text-white/42">{label}</span>{children}</label>;
}

const inputClass = "h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.055] px-3 text-sm text-white outline-none";

export function BuilderProperties({
  layer,
  page,
  onChange,
  onChangePage,
  onDuplicate,
  onDelete,
  onArrange,
  onUpload
}: {
  layer: BuilderLayer | null;
  page: BuilderPage;
  onChange: (patch: Partial<BuilderLayer>) => void;
  onChangePage: (patch: Partial<BuilderPage>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArrange: (direction: "front" | "back") => void;
  onUpload: () => void;
}) {
  if (!layer) {
    return (
      <div className="builder-properties-panel p-4">
        <p className="text-sm font-semibold">Page</p>
        <p className="mt-1 text-xs leading-5 text-white/38">Select any element to style it, or customize the page itself.</p>
        <div className="mt-5 space-y-4">
          <Field label="Page name"><input className={inputClass} value={page.name} onChange={(event) => onChangePage({ name: event.target.value })} /></Field>
          <Field label="Background">
            <div className="flex gap-2"><input type="color" value={page.background.startsWith("#") ? page.background : "#ffffff"} onChange={(event) => onChangePage({ background: event.target.value })} className="h-10 w-12 rounded-xl border border-white/[0.07] bg-transparent p-1" /><input className={inputClass} value={page.background} onChange={(event) => onChangePage({ background: event.target.value })} /></div>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {["#ffffff", "#f6f7fb", "#0d1017", "#f3efe8", "#eaf2ff", "#edf9f4"].map((color) => <button key={color} type="button" onClick={() => onChangePage({ background: color })} className="h-10 rounded-xl border border-white/10" style={{ background: color }} aria-label={`Use ${color} background`} />)}
          </div>
        </div>
      </div>
    );
  }

  const updateStyle = (patch: Partial<BuilderLayer["style"]>) => onChange({ style: { ...layer.style, ...patch } });
  return (
    <div className="builder-properties-panel h-full overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{layer.name}</p><p className="mt-1 text-xs capitalize text-white/35">{layer.type} layer</p></div>
        <div className="flex gap-1">
          <button type="button" title={layer.hidden ? "Show" : "Hide"} onClick={() => onChange({ hidden: !layer.hidden })} className="builder-icon-button">{layer.hidden ? <EyeOff /> : <Eye />}</button>
          <button type="button" title={layer.locked ? "Unlock" : "Lock"} onClick={() => onChange({ locked: !layer.locked })} className="builder-icon-button">{layer.locked ? <Lock /> : <Unlock />}</button>
        </div>
      </div>

      <div className="my-4 h-px bg-white/[0.06]" />
      <div className="space-y-4">
        <Field label="Layer name"><input className={inputClass} value={layer.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="X"><input type="number" className={inputClass} value={Math.round(layer.x)} onChange={(event) => onChange({ x: Number(event.target.value) })} /></Field>
          <Field label="Y"><input type="number" className={inputClass} value={Math.round(layer.y)} onChange={(event) => onChange({ y: Number(event.target.value) })} /></Field>
          <Field label="Width"><input type="number" className={inputClass} value={Math.round(layer.width)} onChange={(event) => onChange({ width: Number(event.target.value) })} /></Field>
          <Field label="Height"><input type="number" className={inputClass} value={Math.round(layer.height)} onChange={(event) => onChange({ height: Number(event.target.value) })} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Rotation"><input type="number" className={inputClass} value={layer.rotation} onChange={(event) => onChange({ rotation: Number(event.target.value) })} /></Field>
          <Field label="Opacity"><input type="number" min="5" max="100" className={inputClass} value={Math.round(layer.opacity * 100)} onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })} /></Field>
        </div>

        {layer.type === "text" ? <Field label="Text"><textarea className="builder-textarea" value={layer.text} onChange={(event) => onChange({ text: event.target.value })} /></Field> : null}
        {layer.type === "checklist" ? <Field label="Items · one per line"><textarea className="builder-textarea min-h-32" value={layer.items.join("\n")} onChange={(event) => onChange({ items: event.target.value.split("\n") })} /></Field> : null}
        {layer.type === "table" ? <Field label="Table · separate columns with |"><textarea className="builder-textarea min-h-36 font-mono text-xs" value={layer.rows.map((row) => row.join(" | ")).join("\n")} onChange={(event) => onChange({ rows: event.target.value.split("\n").map((row) => row.split("|").map((cell) => cell.trim())) })} /></Field> : null}
        {layer.type === "image" ? <><button type="button" onClick={onUpload} className="builder-secondary-button w-full"><ImagePlus className="h-4 w-4" />{layer.imageUrl ? "Replace image" : "Upload image"}</button><Field label="Caption"><textarea className="builder-textarea" value={layer.text} onChange={(event) => onChange({ text: event.target.value })} /></Field></> : null}

        {layer.type !== "image" && layer.type !== "shape" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Font"><select className={inputClass} value={layer.style.fontFamily} onChange={(event) => updateStyle({ fontFamily: event.target.value as BuilderLayer["style"]["fontFamily"] })}><option>Inter</option><option>Clash Display</option><option>Georgia</option><option>JetBrains Mono</option></select></Field>
              <Field label="Size"><input type="number" min="8" max="120" className={inputClass} value={layer.style.fontSize} onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })} /></Field>
              <Field label="Weight"><select className={inputClass} value={layer.style.fontWeight} onChange={(event) => updateStyle({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Heavy</option></select></Field>
              <Field label="Align"><select className={inputClass} value={layer.style.textAlign} onChange={(event) => updateStyle({ textAlign: event.target.value as BuilderLayer["style"]["textAlign"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Field>
            </div>
            <div className="grid grid-cols-2 gap-2"><Field label="Text color"><input type="color" className="builder-color-input" value={layer.style.color} onChange={(event) => updateStyle({ color: event.target.value })} /></Field><Field label="Line height"><input type="number" min="0.8" max="2.5" step="0.05" className={inputClass} value={layer.style.lineHeight} onChange={(event) => updateStyle({ lineHeight: Number(event.target.value) })} /></Field></div>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Fill"><input type="color" className="builder-color-input" value={layer.style.backgroundColor.startsWith("#") ? layer.style.backgroundColor : "#ffffff"} onChange={(event) => updateStyle({ backgroundColor: event.target.value })} /></Field>
          <Field label="Border"><input type="color" className="builder-color-input" value={layer.style.borderColor.startsWith("#") ? layer.style.borderColor : "#d9deea"} onChange={(event) => updateStyle({ borderColor: event.target.value })} /></Field>
          <Field label="Border width"><input type="number" min="0" max="12" className={inputClass} value={layer.style.borderWidth} onChange={(event) => updateStyle({ borderWidth: Number(event.target.value) })} /></Field>
          <Field label="Corner radius"><input type="number" min="0" max="100" className={inputClass} value={layer.style.borderRadius} onChange={(event) => updateStyle({ borderRadius: Number(event.target.value) })} /></Field>
          <Field label="Padding"><input type="number" min="0" max="80" className={inputClass} value={layer.style.padding} onChange={(event) => updateStyle({ padding: Number(event.target.value) })} /></Field>
          {layer.type === "image" ? <Field label="Image fit"><select className={inputClass} value={layer.style.objectFit} onChange={(event) => updateStyle({ objectFit: event.target.value as "cover" | "contain" })}><option value="cover">Cover</option><option value="contain">Contain</option></select></Field> : null}
        </div>
      </div>

      <div className="my-4 h-px bg-white/[0.06]" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onArrange("front")} className="builder-secondary-button"><BringToFront className="h-4 w-4" />To front</button>
        <button type="button" onClick={() => onArrange("back")} className="builder-secondary-button"><SendToBack className="h-4 w-4" />To back</button>
        <button type="button" onClick={onDuplicate} className="builder-secondary-button"><Copy className="h-4 w-4" />Duplicate</button>
        <button type="button" onClick={onDelete} className="builder-secondary-button text-red-300"><Trash2 className="h-4 w-4" />Delete</button>
      </div>
    </div>
  );
}
