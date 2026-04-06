import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

async function getAuthenticatedCoach(request: NextRequest) {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(auth);

  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedCoach(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const [productsRes, ordersRes] = await Promise.all([
    supabaseAdmin
      .from("store_products")
      .select("*")
      .eq("coach_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("orders")
      .select("id, product_id, total, status, created_at")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  }

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  const salesMap = new Map<string, { units: number; revenue: number }>();
  for (const order of ordersRes.data || []) {
    if (!order.product_id) continue;
    const existing = salesMap.get(order.product_id) || { units: 0, revenue: 0 };
    salesMap.set(order.product_id, {
      units: existing.units + 1,
      revenue: existing.revenue + Number(order.total || 0)
    });
  }

  const products = (productsRes.data || []).map((product) => ({
    ...product,
    image_url: product.image_url || product.asset_url || null,
    sales: salesMap.get(product.id) || { units: 0, revenue: 0 }
  }));

  const totalRevenue = [...salesMap.values()].reduce((sum, entry) => sum + entry.revenue, 0);
  const totalOrders = [...salesMap.values()].reduce((sum, entry) => sum + entry.units, 0);

  return NextResponse.json({
    products,
    analytics: {
      totalRevenue,
      totalOrders,
      totalProducts: products.length,
      activeProducts: products.filter((product) => product.active).length,
      recentOrders: (ordersRes.data || []).slice(0, 10)
    }
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedCoach(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, price, type, category, image_url, inventory_unlimited, inventory_count, compare_at_price, featured, tags } = body;

  if (!title || price === undefined || price === null || !type) {
    return NextResponse.json({ error: "title, price, and type are required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const sortOrderRes = await supabaseAdmin
    .from("store_products")
    .select("sort_order")
    .eq("coach_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (sortOrderRes.data?.sort_order || 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("store_products")
    .insert({
      coach_id: user.id,
      title: String(title).trim(),
      description: typeof description === "string" ? description.trim() : "",
      price: Number(price),
      type,
      category: category || type,
      image_url: image_url || null,
      asset_url: image_url || null,
      inventory_unlimited: inventory_unlimited !== false,
      inventory_count: inventory_unlimited === false ? Number(inventory_count || 0) : null,
      compare_at_price: toNumber(compare_at_price),
      featured: Boolean(featured),
      tags: normalizeTags(tags),
      active: true,
      sort_order: nextSortOrder
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    product: {
      ...data,
      image_url: data.image_url || data.asset_url || null,
      sales: { units: 0, revenue: 0 }
    }
  });
}
