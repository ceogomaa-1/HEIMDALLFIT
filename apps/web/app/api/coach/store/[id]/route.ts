import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

async function verifyCoach(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyCoach(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = {
    ...body,
    asset_url: body.image_url ?? body.asset_url ?? null
  };

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("store_products")
    .update(payload)
    .eq("id", params.id)
    .eq("coach_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    product: {
      ...data,
      image_url: data.image_url || data.asset_url || null
    }
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyCoach(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("store_products")
    .delete()
    .eq("id", params.id)
    .eq("coach_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
