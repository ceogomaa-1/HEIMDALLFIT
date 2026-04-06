"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Dumbbell,
  Eye,
  FileText,
  Package2,
  Pencil,
  Phone,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { CoachShell } from "../../../components/coach-shell";
import { GlassPanel } from "../../../components/glass";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";
import { useCountUp } from "../../../lib/use-count-up";

type ProductType = "ebook" | "merch" | "program" | "coaching_call" | "bundle";

type StoreProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  type: ProductType;
  category: string;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  inventory_unlimited: boolean;
  inventory_count: number | null;
  tags: string[];
  downloads_count: number;
  created_at: string;
  sales: { units: number; revenue: number };
};

type StoreAnalytics = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeProducts: number;
  recentOrders: Array<{ id: string; product_id: string | null; total: number; status: string; created_at: string }>;
};

type PageMode = "edit" | "preview";
type DrawerMode = "add" | "edit" | null;
type FilterTab = "all" | "active" | "inactive" | "featured";

const PRODUCT_TYPES: Array<{ value: ProductType; label: string; icon: typeof FileText; color: string; gradient: string }> = [
  { value: "ebook", label: "E-book", icon: FileText, color: "var(--type-ebook, #3B82F6)", gradient: "linear-gradient(135deg, #1e3a5f, #0f1f35)" },
  { value: "merch", label: "Merch", icon: Shirt, color: "var(--type-merch, #A855F7)", gradient: "linear-gradient(135deg, #3d1f5f, #1f0f35)" },
  { value: "program", label: "Program", icon: Dumbbell, color: "var(--type-program, #10B981)", gradient: "linear-gradient(135deg, #1f3d1f, #0f1f0f)" },
  { value: "coaching_call", label: "Call", icon: Phone, color: "var(--type-call, #F59E0B)", gradient: "linear-gradient(135deg, #3d2a1f, #1f150f)" },
  { value: "bundle", label: "Bundle", icon: Package2, color: "var(--type-bundle, #EC4899)", gradient: "linear-gradient(135deg, #2d1f3d, #160f1f)" }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function productTypeMeta(type: ProductType) {
  return PRODUCT_TYPES.find((item) => item.value === type) || PRODUCT_TYPES[0];
}

function buildTrend(recentOrders: StoreAnalytics["recentOrders"]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const bucket = new Date(now);
    bucket.setHours(0, 0, 0, 0);
    bucket.setDate(now.getDate() - (6 - index));
    const nextBucket = new Date(bucket);
    nextBucket.setDate(bucket.getDate() + 1);
    return recentOrders
      .filter((order) => {
        const created = new Date(order.created_at).getTime();
        return created >= bucket.getTime() && created < nextBucket.getTime();
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
  });
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const lastValue = values[values.length - 1] || 0;
  const lastX = values.length > 1 ? 100 : 0;
  const lastY = 100 - (lastValue / max) * 100;

  return (
    <svg viewBox="0 0 100 100" className="h-20 w-full overflow-visible">
      {[20, 40, 60, 80].map((line) => (
        <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      ))}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        style={{ filter: "drop-shadow(0 0 6px currentColor) drop-shadow(0 0 12px rgba(37,99,235,0.12))" }}
      />
      <circle cx={lastX} cy={lastY} r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.3" style={{ animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
      <circle cx={lastX} cy={lastY} r="4" fill={color} style={{ filter: "drop-shadow(0 0 6px currentColor)" }} />
    </svg>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "999px",
        background: checked ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.12)",
        border: `1px solid ${checked ? "rgba(16,185,129,0.38)" : "rgba(255,255,255,0.12)"}`,
        padding: "2px",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)"
      }}
    >
      <span
        style={{
          display: "block",
          width: "14px",
          height: "14px",
          borderRadius: "999px",
          background: checked ? "var(--green)" : "rgba(255,255,255,0.9)",
          transform: `translateX(${checked ? 16 : 0}px)`,
          transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), background 0.2s"
        }}
      />
    </button>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleActive,
  pendingDelete
}: {
  product: StoreProduct;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  pendingDelete: boolean;
}) {
  const meta = productTypeMeta(product.type);
  const savings = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const inventoryLabel = product.inventory_unlimited
    ? "∞ unlimited"
    : (product.inventory_count || 0) <= 0
      ? "Out of stock"
      : `${product.inventory_count} in stock`;
  const inventoryColor = product.inventory_unlimited
    ? "var(--green)"
    : (product.inventory_count || 0) <= 0
      ? "#EF4444"
      : (product.inventory_count || 0) < 10
        ? "var(--amber)"
        : "var(--text-secondary)";

  return (
    <div
      className="group animate-slide-up overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(12,12,20,0.95),rgba(8,8,14,0.98))] shadow-[var(--shadow-card)]"
      style={{ transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease" }}
    >
      <div className="relative h-[180px] overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div style={{ background: meta.gradient }} className="flex h-full w-full items-center justify-center">
            <meta.icon className="h-8 w-8 text-white/20" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-md">
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: product.active ? "var(--green)" : "var(--amber)"
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/80">{product.active ? "Live" : "Draft"}</span>
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          <span
            style={{ background: `${meta.color}22`, borderColor: `${meta.color}55`, color: meta.color }}
            className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]"
          >
            {meta.label}
          </span>
          {product.featured ? (
            <span className="rounded-full border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.16)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--amber)]">
              ★ Featured
            </span>
          ) : null}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="font-display text-[18px] font-semibold tracking-[-0.04em] text-white">{product.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[var(--text-secondary)]">{product.description || "No description yet."}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-display text-[22px] font-semibold tracking-[-0.05em] text-white">{formatCurrency(product.price)}</span>
          {product.compare_at_price ? (
            <span className="text-[14px] text-[var(--text-muted)] line-through">{formatCurrency(product.compare_at_price)}</span>
          ) : null}
          {savings > 0 ? (
            <span className="rounded-full border border-[rgba(16,185,129,0.22)] bg-[rgba(16,185,129,0.12)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--green)]">
              Save {savings}%
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>{product.sales.units} sold</span>
          <span>{formatCompactCurrency(product.sales.revenue)} rev</span>
          <span style={{ color: inventoryColor }}>{inventoryLabel}</span>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-3">
            <ToggleSwitch checked={product.active} onChange={onToggleActive} />
            <span className="text-[12px] text-[var(--text-secondary)]">{product.active ? "Published" : "Hidden"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-white/65 transition hover:border-[var(--border-accent)] hover:bg-[var(--accent-dim)] hover:text-white">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-[10px] border px-3 py-1.5 text-[12px] transition"
              style={{
                borderColor: pendingDelete ? "rgba(239,68,68,0.28)" : "rgba(255,255,255,0.08)",
                background: pendingDelete ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                color: pendingDelete ? "rgb(252 165 165)" : "rgba(255,255,255,0.65)"
              }}
            >
              {pendingDelete ? "Confirm?" : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDrawer({
  drawerMode,
  form,
  setForm,
  tagInput,
  setTagInput,
  onClose,
  onSave,
  onDelete,
  saving,
  uploadingImage,
  handleImageUpload,
  imageInputRef
}: {
  drawerMode: DrawerMode;
  form: {
    title: string;
    description: string;
    price: string;
    compare_at_price: string;
    type: ProductType;
    category: string;
    image_url: string;
    inventory_unlimited: boolean;
    inventory_count: string;
    featured: boolean;
    tags: string[];
    active: boolean;
  };
  setForm: Dispatch<SetStateAction<{
    title: string;
    description: string;
    price: string;
    compare_at_price: string;
    type: ProductType;
    category: string;
    image_url: string;
    inventory_unlimited: boolean;
    inventory_count: string;
    featured: boolean;
    tags: string[];
    active: boolean;
  }>>;
  tagInput: string;
  setTagInput: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  uploadingImage: boolean;
  handleImageUpload: (file: File) => Promise<void>;
  imageInputRef: RefObject<HTMLInputElement | null>;
}) {
  const savingPercent =
    form.compare_at_price && Number(form.compare_at_price) > Number(form.price || 0)
      ? Math.round(((Number(form.compare_at_price) - Number(form.price || 0)) / Number(form.compare_at_price)) * 100)
      : 0;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[4px]" onClick={onClose} />
      <aside
        className="fixed bottom-0 right-0 top-0 z-[100] flex w-full max-w-[480px] flex-col border-l border-white/[0.08] shadow-[-32px_0_80px_rgba(0,0,0,0.8)]"
        style={{ background: "rgba(8,8,16,0.97)", backdropFilter: "blur(32px)", animation: "slideInLeft 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) {
              await handleImageUpload(file);
            }
            event.target.value = "";
          }}
        />
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="card-eyebrow">Store Product</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.04em] text-white">
              {drawerMode === "add" ? "Add Product" : "Edit Product"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-white/65">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <p className="card-eyebrow">Product Identity</p>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/25" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25" />
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, type: type.value, category: current.category || type.value }))}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition"
                  style={{
                    borderColor: form.type === type.value ? `${type.color}66` : "rgba(255,255,255,0.08)",
                    background: form.type === type.value ? `${type.color}22` : "rgba(255,255,255,0.03)",
                    color: form.type === type.value ? "#fff" : "rgba(255,255,255,0.6)"
                  }}
                >
                  <type.icon className="h-3.5 w-3.5" />
                  {type.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="card-eyebrow">Media</p>
            <div onClick={() => imageInputRef.current?.click()} className="relative flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-white/[0.14] bg-white/[0.03] text-center">
              {form.image_url ? (
                <>
                  <img src={form.image_url} alt={form.title || "Product image"} className="absolute inset-0 h-full w-full rounded-[18px] object-cover" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setForm((current) => ({ ...current, image_url: "" }));
                    }}
                    className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                  {uploadingImage ? <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden rounded-b-[18px] bg-white/10"><div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" /></div> : null}
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-white/30" />
                  <p className="mt-4 text-sm text-white/75">Drag & drop or click to upload</p>
                  <p className="mt-2 text-xs text-white/35">Store cover image</p>
                </>
              )}
            </div>
            <input value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="Or paste an image URL" className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/25" />
          </section>

          <section className="space-y-3">
            <p className="card-eyebrow">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <p className="card-eyebrow">Price</p>
                <div className="mt-3 flex items-center gap-2 text-white">
                  <span className="font-display text-[22px]">$</span>
                  <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="0.00" className="h-10 w-full bg-transparent font-display text-[24px] text-white outline-none placeholder:text-white/20" />
                </div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <p className="card-eyebrow">Compare At</p>
                <div className="mt-3 flex items-center gap-2 text-white">
                  <span className="font-display text-[22px]">$</span>
                  <input value={form.compare_at_price} onChange={(event) => setForm((current) => ({ ...current, compare_at_price: event.target.value }))} placeholder="0.00" className="h-10 w-full bg-transparent font-display text-[24px] text-white outline-none placeholder:text-white/20" />
                </div>
              </div>
            </div>
            {savingPercent > 0 ? (
              <span className="inline-flex rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--green)]">
                Save {savingPercent}%
              </span>
            ) : null}
          </section>

          <section className="space-y-3">
            <p className="card-eyebrow">Inventory</p>
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={form.inventory_unlimited} onChange={() => setForm((current) => ({ ...current, inventory_unlimited: !current.inventory_unlimited }))} />
              <span className="text-sm text-white/75">{form.inventory_unlimited ? "Unlimited ∞" : "Track quantity"}</span>
            </div>
            {!form.inventory_unlimited ? (
              <input value={form.inventory_count} onChange={(event) => setForm((current) => ({ ...current, inventory_count: event.target.value }))} placeholder="Stock count" className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/25" />
            ) : null}
          </section>

          <section className="space-y-3">
            <p className="card-eyebrow">Visibility</p>
            <div className="space-y-3 rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/75">Published</span>
                <ToggleSwitch checked={form.active} onChange={() => setForm((current) => ({ ...current, active: !current.active }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/75">Featured</span>
                <ToggleSwitch checked={form.featured} onChange={() => setForm((current) => ({ ...current, featured: !current.featured }))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="card-eyebrow">Tags</p>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/75">
                  {tag}
                  <button type="button" onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((entry) => entry !== tag) }))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextTag = tagInput.trim();
                  if (!nextTag) return;
                  setForm((current) => ({ ...current, tags: Array.from(new Set([...current.tags, nextTag])).slice(0, 12) }));
                  setTagInput("");
                }
              }}
              placeholder="Type a tag and press Enter"
              className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/25"
            />
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-[12px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-red-300"
            style={{ visibility: drawerMode === "edit" ? "visible" : "hidden" }}
          >
            Delete Product
          </button>
          <button type="button" onClick={onSave} className="btn-primary inline-flex items-center gap-2">
            {saving ? <Sparkles className="h-4 w-4 animate-spin" /> : drawerMode === "add" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving..." : drawerMode === "add" ? "Add to Store" : "Save Changes"}
          </button>
        </footer>
      </aside>
    </>
  );
}

export default function CoachStorePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PageMode>("edit");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState({ name: "Coach", handle: "@coach", role: "Coach", avatar: null as string | null });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [previewTypeFilter, setPreviewTypeFilter] = useState<string>("all");
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    compare_at_price: "",
    type: "ebook" as ProductType,
    category: "",
    image_url: "",
    inventory_unlimited: true,
    inventory_count: "",
    featured: false,
    tags: [] as string[],
    active: true
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!pendingDeleteId) return;
    const timeout = setTimeout(() => setPendingDeleteId(null), 3000);
    return () => clearTimeout(timeout);
  }, [pendingDeleteId]);

  async function fetchStore() {
    if (!supabase || !isSupabaseConfigured) {
      setToast({ tone: "error", message: "Supabase is not configured for the store." });
      setLoading(false);
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!session?.access_token || !user) {
      setToast({ tone: "error", message: "Coach session missing. Please log in again." });
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    const fallbackName = (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) || user.email?.split("@")[0] || "Coach";
    setProfile({
      name: fallbackName,
      handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@coach",
      role: "Coach",
      avatar: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null
    });

    const response = await fetch("/api/coach/store", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load store.");
    }

    setProducts(payload.products || []);
    setAnalytics(payload.analytics || null);
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await fetchStore();
      } catch (error) {
        if (active) setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to load store." });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      price: "",
      compare_at_price: "",
      type: "ebook",
      category: "",
      image_url: "",
      inventory_unlimited: true,
      inventory_count: "",
      featured: false,
      tags: [],
      active: true
    });
    setTagInput("");
    setEditingProduct(null);
  }

  function openAddDrawer() {
    resetForm();
    setDrawerMode("add");
  }

  function openEditDrawer(product: StoreProduct) {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      price: String(product.price),
      compare_at_price: product.compare_at_price ? String(product.compare_at_price) : "",
      type: product.type,
      category: product.category || product.type,
      image_url: product.image_url || "",
      inventory_unlimited: product.inventory_unlimited,
      inventory_count: product.inventory_count?.toString() || "",
      featured: product.featured,
      tags: product.tags || [],
      active: product.active
    });
    setTagInput("");
    setDrawerMode("edit");
  }

  async function handleImageUpload(file: File) {
    if (!supabase || !currentUserId) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      setForm((current) => ({ ...current, image_url: data.publicUrl }));
      setToast({ tone: "success", message: "Image uploaded." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to upload image." });
    } finally {
      setUploadingImage(false);
    }
  }

  async function persistProduct() {
    if (!supabase) return;
    setSaving(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");

      const payload = {
        title: form.title,
        description: form.description,
        price: form.price,
        compare_at_price: form.compare_at_price || null,
        type: form.type,
        category: form.category || form.type,
        image_url: form.image_url || null,
        inventory_unlimited: form.inventory_unlimited,
        inventory_count: form.inventory_unlimited ? null : form.inventory_count || 0,
        featured: form.featured,
        tags: form.tags,
        active: form.active
      };

      const response = await fetch(drawerMode === "edit" && editingProduct ? `/api/coach/store/${editingProduct.id}` : "/api/coach/store", {
        method: drawerMode === "edit" && editingProduct ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to save product.");
      }

      const nextProduct = {
        ...result.product,
        sales: drawerMode === "edit" && editingProduct ? editingProduct.sales : result.product.sales || { units: 0, revenue: 0 }
      } as StoreProduct;

      setProducts((current) =>
        drawerMode === "edit" && editingProduct
          ? current.map((product) => (product.id === editingProduct.id ? nextProduct : product))
          : [nextProduct, ...current]
      );
      setDrawerMode(null);
      setEditingProduct(null);
      setToast({ tone: "success", message: drawerMode === "edit" ? "Product updated." : "Product added to your store." });
      setAnalytics((current) =>
        current
          ? {
              ...current,
              totalProducts: drawerMode === "edit" ? current.totalProducts : current.totalProducts + 1,
              activeProducts: drawerMode === "edit"
                ? current.activeProducts
                : current.activeProducts + (nextProduct.active ? 1 : 0)
            }
          : current
      );
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to save product." });
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    if (!supabase) return;
    setDeletingId(id);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");
      const response = await fetch(`/api/coach/store/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete product.");
      const removed = products.find((product) => product.id === id);
      setProducts((current) => current.filter((product) => product.id !== id));
      setAnalytics((current) =>
        current && removed
          ? {
              ...current,
              totalProducts: Math.max(0, current.totalProducts - 1),
              activeProducts: Math.max(0, current.activeProducts - (removed.active ? 1 : 0))
            }
          : current
      );
      if (editingProduct?.id === id) {
        setDrawerMode(null);
        setEditingProduct(null);
      }
      setToast({ tone: "success", message: "Product deleted." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to delete product." });
    } finally {
      setPendingDeleteId(null);
      setDeletingId(null);
    }
  }

  async function toggleProductActive(product: StoreProduct) {
    if (!supabase) return;
    const nextActive = !product.active;
    setProducts((current) => current.map((entry) => (entry.id === product.id ? { ...entry, active: nextActive } : entry)));
    setAnalytics((current) =>
      current
        ? {
            ...current,
            activeProducts: current.activeProducts + (nextActive ? 1 : -1)
          }
        : current
    );

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");
      const response = await fetch(`/api/coach/store/${product.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active: nextActive })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update product.");
    } catch (error) {
      setProducts((current) => current.map((entry) => (entry.id === product.id ? { ...entry, active: product.active } : entry)));
      setAnalytics((current) =>
        current
          ? {
              ...current,
              activeProducts: current.activeProducts + (product.active ? 0 : 1) - (nextActive ? 1 : 0)
            }
          : current
      );
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to update product." });
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesFilter =
        filterTab === "all" ||
        (filterTab === "active" && product.active) ||
        (filterTab === "inactive" && !product.active) ||
        (filterTab === "featured" && product.featured);
      const matchesSearch = !searchQuery.trim() || `${product.title} ${product.description} ${product.category}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [products, filterTab, searchQuery]);

  const activePreviewProducts = useMemo(
    () => products.filter((product) => product.active).filter((product) => previewTypeFilter === "all" || product.type === previewTypeFilter),
    [previewTypeFilter, products]
  );
  const featuredProduct = useMemo(() => products.find((product) => product.active && product.featured) || null, [products]);
  const trendValues = useMemo(() => buildTrend(analytics?.recentOrders || []), [analytics]);
  const totalRevenueCount = useCountUp(Math.round(analytics?.totalRevenue || 0));
  const totalOrdersCount = useCountUp(analytics?.totalOrders || 0);
  const totalProductsCount = useCountUp(analytics?.totalProducts || 0);
  const activeProductsCount = analytics?.activeProducts || 0;
  const categoryOptions = Array.from(new Set(products.filter((product) => product.active).map((product) => product.type)));
  const topProducts = [...products].sort((a, b) => b.sales.revenue - a.sales.revenue).slice(0, 5);
  const topRevenue = Math.max(...topProducts.map((product) => product.sales.revenue), 1);
  const inventoryAlerts = products.filter((product) => !product.inventory_unlimited && ((product.inventory_count || 0) < 10));

  return (
    <CoachShell profile={profile}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-bright)]">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[20px] font-semibold tracking-[-0.04em] text-white">My Store</h1>
              <span className="rounded-full border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.12)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--green)]">
                {activeProductsCount} live
              </span>
            </div>
          </div>

          {mode === "edit" && analytics ? (
            <div className="hidden items-center gap-4 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 xl:flex">
              {[
                { label: "Revenue", value: formatCompactCurrency(totalRevenueCount) },
                { label: "Orders", value: String(totalOrdersCount) },
                { label: "Products", value: String(totalProductsCount) }
              ].map((chip, index) => (
                <div key={chip.label} className="flex items-center gap-4">
                  {index > 0 ? <div className="h-8 w-px bg-white/[0.08]" /> : null}
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">{chip.label}</p>
                    <p className="mt-1 text-[16px] font-semibold text-white">{chip.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <div />}

          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-[200px] items-center rounded-full border border-white/[0.08] bg-white/[0.04] p-[3px]">
              <div style={{ position: "absolute", top: "3px", left: mode === "edit" ? "3px" : "calc(50% + 0px)", width: "calc(50% - 3px)", bottom: "3px", background: mode === "edit" ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.10)", border: mode === "edit" ? "1px solid rgba(37,99,235,0.40)" : "1px solid rgba(255,255,255,0.15)", borderRadius: "999px", transition: "left 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s" }} />
              {(["edit", "preview"] as PageMode[]).map((entry) => (
                <button key={entry} type="button" onClick={() => setMode(entry)} style={{ position: "relative", flex: 1, padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: mode === entry ? "white" : "rgba(255,255,255,0.4)", transition: "color 0.2s", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  {entry === "edit" ? <Pencil size={11} /> : <Eye size={11} />}
                  {entry.charAt(0).toUpperCase() + entry.slice(1)}
                </button>
              ))}
            </div>
            {mode === "edit" ? <button type="button" onClick={openAddDrawer} className="btn-primary inline-flex h-10 items-center gap-2 px-4"><Plus className="h-4 w-4" />Add Product</button> : null}
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-white/[0.03]">
                    <div className="skeleton h-[180px] w-full" />
                    <div className="space-y-3 p-5">
                      <div className="skeleton h-5 w-2/3" />
                      <div className="skeleton h-4 w-full" />
                      <div className="skeleton h-4 w-5/6" />
                      <div className="skeleton h-6 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-8 w-32" />
                  <div className="skeleton h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : mode === "edit" ? (
          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col overflow-hidden">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {([
                    { key: "all", label: "All", count: products.length },
                    { key: "active", label: "Active", count: products.filter((product) => product.active).length },
                    { key: "inactive", label: "Inactive", count: products.filter((product) => !product.active).length },
                    { key: "featured", label: "Featured ★", count: products.filter((product) => product.featured).length }
                  ] as Array<{ key: FilterTab; label: string; count: number }>).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterTab(tab.key)}
                      className="rounded-full border px-3 py-2 text-[12px] transition"
                      style={{
                        borderColor: filterTab === tab.key ? "rgba(37,99,235,0.32)" : "rgba(255,255,255,0.08)",
                        background: filterTab === tab.key ? "rgba(37,99,235,0.16)" : "rgba(255,255,255,0.04)",
                        color: filterTab === tab.key ? "#fff" : "rgba(255,255,255,0.55)"
                      }}
                    >
                      {tab.label} <span className="font-mono text-[10px] text-white/45">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="flex h-11 w-full items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 md:w-[240px]">
                  <Search className="h-4 w-4 text-white/30" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products..."
                    className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {filteredProducts.length ? (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        pendingDelete={pendingDeleteId === product.id}
                        onEdit={() => openEditDrawer(product)}
                        onToggleActive={() => toggleProductActive(product)}
                        onDelete={() => {
                          if (pendingDeleteId === product.id) {
                            void removeProduct(product.id);
                            return;
                          }
                          setPendingDeleteId(product.id);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <GlassPanel className="flex h-[300px] items-center justify-center p-8 text-center">
                    <div className="max-w-[360px]">
                      <ShoppingBag className="mx-auto h-12 w-12 text-white/15" />
                      <h3 className="mt-6 font-display text-[24px] font-semibold tracking-[-0.04em] text-white">
                        {filterTab === "all" ? "No products yet" : "No products match this view"}
                      </h3>
                      <p className="mt-3 text-[14px] leading-7 text-[var(--text-secondary)]">
                        {filterTab === "all"
                          ? "Start building your mini-shop right here. Add digital programs, merch, calls, and bundles your clients can actually buy."
                          : "Try another filter or search term. Your products will show up here as soon as they match this tab."}
                      </p>
                      {filterTab === "all" ? (
                        <button type="button" onClick={openAddDrawer} className="btn-primary mt-6 inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add your first product
                        </button>
                      ) : null}
                    </div>
                  </GlassPanel>
                )}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="space-y-4">
                <GlassPanel className="p-5">
                  <p className="card-eyebrow">Store Revenue</p>
                  <div className="mt-3 font-display text-[34px] font-semibold tracking-[-0.06em] text-white">
                    {formatCurrency(totalRevenueCount)}
                  </div>
                  <div className="mt-3">
                    <Sparkline values={trendValues} color="var(--green)" />
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                    {analytics?.totalOrders || 0} orders moving through your store right now.
                  </p>
                </GlassPanel>

                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="card-eyebrow">Top Performers</p>
                    <Star className="h-4 w-4 text-[var(--amber)]" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {topProducts.length ? (
                      topProducts.map((product, index) => (
                        <div key={product.id} className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-ghost)]">#{index + 1}</p>
                              <p className="mt-1 truncate text-[13px] font-semibold text-white">{product.title}</p>
                            </div>
                            <p className="text-[13px] font-semibold text-[var(--green)]">{formatCompactCurrency(product.sales.revenue)}</p>
                          </div>
                          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(10, (product.sales.revenue / topRevenue) * 100)}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-white/[0.1] px-4 py-6 text-center text-[13px] text-[var(--text-secondary)]">
                        Your best sellers will rank here once orders start landing.
                      </div>
                    )}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-5">
                  <p className="card-eyebrow">Recent Sales</p>
                  <div className="mt-4 space-y-3">
                    {analytics?.recentOrders?.length ? (
                      analytics.recentOrders.map((order) => (
                        <div key={order.id} className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-ghost)]">{order.id.slice(0, 8)}</p>
                              <p className="mt-1 text-[13px] font-semibold text-white">{formatCurrency(Number(order.total || 0))}</p>
                            </div>
                            <span
                              className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
                              style={{
                                borderColor:
                                  order.status === "completed"
                                    ? "rgba(16,185,129,0.24)"
                                    : order.status === "failed"
                                      ? "rgba(239,68,68,0.24)"
                                      : "rgba(245,158,11,0.24)",
                                background:
                                  order.status === "completed"
                                    ? "rgba(16,185,129,0.12)"
                                    : order.status === "failed"
                                      ? "rgba(239,68,68,0.12)"
                                      : "rgba(245,158,11,0.12)",
                                color:
                                  order.status === "completed"
                                    ? "var(--green)"
                                    : order.status === "failed"
                                      ? "#fca5a5"
                                      : "var(--amber)"
                              }}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{relativeTime(order.created_at)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-white/[0.1] px-4 py-8 text-center text-[13px] text-[var(--text-secondary)]">
                        First sale incoming...
                      </div>
                    )}
                  </div>
                </GlassPanel>

                {inventoryAlerts.length ? (
                  <GlassPanel className="p-5">
                    <p className="card-eyebrow">Inventory Alerts</p>
                    <div className="mt-4 space-y-3">
                      {inventoryAlerts.map((product) => {
                        const out = (product.inventory_count || 0) <= 0;
                        return (
                          <div key={product.id} className="flex items-center justify-between rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                            <span className="truncate pr-3 text-[13px] text-white">{product.title}</span>
                            <span
                              className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
                              style={{
                                borderColor: out ? "rgba(239,68,68,0.24)" : "rgba(245,158,11,0.24)",
                                background: out ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                                color: out ? "#fca5a5" : "var(--amber)"
                              }}
                            >
                              {out ? "Out" : `${product.inventory_count} left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </GlassPanel>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.08)] px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amber)]">
              <span className="inline-flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                Preview Mode — This is how clients see your store
              </span>
            </div>

            <div className="space-y-6 p-5">
              <GlassPanel className="overflow-hidden p-0">
                <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(135deg,rgba(8,26,50,0.95),rgba(9,18,15,0.96))] px-8 py-8">
                  <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22),transparent_70%)]" />
                  <div className="absolute bottom-0 left-[30%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.14),transparent_70%)]" />
                  <div className="relative flex h-full flex-col justify-between gap-8 lg:flex-row lg:items-end">
                    <div className="max-w-[680px]">
                      <p className="card-eyebrow">Coach Storefront</p>
                      <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-[-0.06em] text-white">
                        {profile.name}&apos;s Store
                      </h2>
                      <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[var(--text-secondary)]">
                        Premium programs, digital products, and coaching offers that clients can buy directly inside the HEIMDALLFIT portal.
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/[0.08] bg-black/25 px-5 py-4 backdrop-blur-md">
                      <p className="card-eyebrow">Available</p>
                      <p className="mt-2 font-display text-[28px] font-semibold tracking-[-0.05em] text-white">
                        {activePreviewProducts.length} products
                      </p>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["all", ...categoryOptions] as string[]).map((type) => {
                  const active = previewTypeFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPreviewTypeFilter(type)}
                      className="shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold transition"
                      style={{
                        borderColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                        background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.04)",
                        color: active ? "#0b1020" : "rgba(255,255,255,0.6)"
                      }}
                    >
                      {type === "all" ? "All" : productTypeMeta(type as ProductType).label}
                    </button>
                  );
                })}
              </div>

              {featuredProduct && (previewTypeFilter === "all" || previewTypeFilter === featuredProduct.type) ? (
                <GlassPanel className="overflow-hidden p-0">
                  <div className="grid min-h-[280px] md:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
                    <div className="relative min-h-[220px] overflow-hidden">
                      {featuredProduct.image_url ? (
                        <img src={featuredProduct.image_url} alt={featuredProduct.title} className="h-full w-full object-cover" />
                      ) : (
                        <div style={{ background: productTypeMeta(featuredProduct.type).gradient }} className="flex h-full w-full items-center justify-center">
                          {(() => {
                            const Icon = productTypeMeta(featuredProduct.type).icon;
                            return <Icon className="h-12 w-12 text-white/20" />;
                          })()}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex flex-col justify-center gap-5 p-8"
                      style={{
                        background: `linear-gradient(135deg, ${productTypeMeta(featuredProduct.type).color}18, rgba(255,255,255,0.02))`
                      }}
                    >
                      <span className="inline-flex w-fit rounded-full border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.14)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber)]">
                        ★ Featured
                      </span>
                      <div>
                        <h3 className="font-display text-[32px] font-semibold tracking-[-0.05em] text-white">{featuredProduct.title}</h3>
                        <p className="mt-3 max-w-[560px] text-[15px] leading-7 text-[var(--text-secondary)]">
                          {featuredProduct.description || "A high-conviction offer presented exactly how clients will discover it in your storefront."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-[28px] font-semibold tracking-[-0.05em] text-white">{formatCurrency(featuredProduct.price)}</span>
                          {featuredProduct.compare_at_price ? (
                            <span className="text-[15px] text-[var(--text-muted)] line-through">{formatCurrency(featuredProduct.compare_at_price)}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => setToast({ tone: "success", message: "Preview mode — Stripe checkout would open here." })}
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              ) : null}

              {activePreviewProducts.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {activePreviewProducts.map((product) => {
                    const meta = productTypeMeta(product.type);
                    const savings = product.compare_at_price && product.compare_at_price > product.price
                      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
                      : 0;
                    return (
                      <GlassPanel key={product.id} className="overflow-hidden p-0">
                        <div className="relative h-[200px] overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div style={{ background: meta.gradient }} className="flex h-full w-full items-center justify-center">
                              <meta.icon className="h-10 w-10 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 p-5">
                          <span
                            className="inline-flex rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
                            style={{ borderColor: `${meta.color}55`, background: `${meta.color}18`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <div>
                            <h3 className="font-display text-[20px] font-semibold tracking-[-0.04em] text-white">{product.title}</h3>
                            <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[var(--text-secondary)]">
                              {product.description || "This offer is ready to convert clients directly from the portal."}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-display text-[24px] font-semibold tracking-[-0.05em] text-white">{formatCurrency(product.price)}</span>
                            {product.compare_at_price ? (
                              <span className="text-[14px] text-[var(--text-muted)] line-through">{formatCurrency(product.compare_at_price)}</span>
                            ) : null}
                            {savings > 0 ? (
                              <span className="rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--green)]">
                                Save {savings}%
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => setToast({ tone: "success", message: "Preview mode — Stripe checkout would open here." })}
                            className="btn-primary inline-flex h-11 w-full items-center justify-center gap-2"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Buy Now
                          </button>
                        </div>
                      </GlassPanel>
                    );
                  })}
                </div>
              ) : (
                <GlassPanel className="flex min-h-[320px] items-center justify-center p-8 text-center">
                  <div className="max-w-[420px]">
                    <ShoppingBag className="mx-auto h-14 w-14 text-white/15" />
                    <h3 className="mt-6 font-display text-[24px] font-semibold tracking-[-0.05em] text-white">Your store is empty</h3>
                    <p className="mt-3 text-[14px] leading-7 text-[var(--text-secondary)]">
                      Add products in Edit mode and they&apos;ll instantly show up here exactly the way clients will experience them.
                    </p>
                  </div>
                </GlassPanel>
              )}
            </div>
          </div>
        )}

        {drawerMode ? (
          <ProductDrawer
            drawerMode={drawerMode}
            form={form}
            setForm={setForm}
            tagInput={tagInput}
            setTagInput={setTagInput}
            onClose={() => {
              setDrawerMode(null);
              setEditingProduct(null);
              setPendingDeleteId(null);
            }}
            onSave={() => void persistProduct()}
            onDelete={() => {
              if (!editingProduct) return;
              if (pendingDeleteId === editingProduct.id) {
                void removeProduct(editingProduct.id);
                return;
              }
              setPendingDeleteId(editingProduct.id);
            }}
            saving={saving}
            uploadingImage={uploadingImage}
            handleImageUpload={handleImageUpload}
            imageInputRef={imageInputRef}
          />
        ) : null}

        {toast ? (
          <div className="pointer-events-none fixed right-6 top-6 z-[120]">
            <div
              className="animate-slide-up flex items-center gap-3 rounded-[16px] border px-4 py-3 shadow-[0_24px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl"
              style={{
                borderColor: toast.tone === "success" ? "rgba(16,185,129,0.24)" : "rgba(239,68,68,0.24)",
                background: toast.tone === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: "#fff"
              }}
            >
              {toast.tone === "success" ? <ShoppingCart className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span className="text-sm">{toast.message}</span>
            </div>
          </div>
        ) : null}
      </div>
    </CoachShell>
  );
}
