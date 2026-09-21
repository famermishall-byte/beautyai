import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

// Staff of the store (owner only): list, and appoint / change / remove someone by e-mail.
// The heavy lifting is done by the SQL functions staff_list / staff_set (supabase/staff_roles.sql), which
// re-check on the database side that the caller is the owner.

type RpcError = { code?: string; message?: string };

function explain(error: RpcError): string {
  // PGRST202 / 42883: the function does not exist yet → the migration was not run.
  if (error.code === "PGRST202" || error.code === "42883") return "Сначала нужно запустить SQL «staff_roles» в Supabase.";
  // P0001: our own `raise exception` messages are written for the user.
  if (error.code === "P0001" && error.message) return error.message;
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("staff_list");
  if (error) return NextResponse.json({ error: explain(error) }, { status: 400 });

  return NextResponse.json({
    staff: (data ?? []).map((r: Record<string, unknown>) => ({
      userId: r.user_id as string,
      email: r.email as string,
      displayName: (r.display_name as string | null) ?? null,
      role: r.role as string,
      branchId: (r.branch_id as string | null) ?? null,
      branchName: (r.branch_name as string | null) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const role = String(body.role ?? "");
  const branchId = body.branchId ? String(body.branchId) : null;
  if (!email) return NextResponse.json({ error: "Введите почту сотрудника." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("staff_set", { target_email: email, new_role: role, new_branch: branchId });
  if (error) return NextResponse.json({ error: explain(error) }, { status: 400 });
  return NextResponse.json({ ok: true });
}
