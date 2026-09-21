import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import type { OrderItem } from "@/types";

// Клиент без авторизации пользователя — RLS теперь ограничивает доступ к данным
// (products/branches/orders/stores) только авторизованным пользователям своего
// магазина, так что этот клиент сам по себе ничего чужого прочитать не может.
// Для запросов от имени конкретного пользователя используйте
// createServerSupabaseClient() из "@/lib/supabase/server".
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function mapProduct(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as string,
    price: row.price as number,
    description: row.description as string | null,
    characteristics: row.characteristics as string | null,
    purpose: row.purpose as string | null,
    inStock: row.in_stock as boolean,
    imageUrl: row.image_url as string | null,
  };
}

export function mapBranch(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
    address: row.address as string,
    phone: row.phone as string,
    whatsapp: row.whatsapp as string,
    hours: row.hours as string,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
  };
}

export function mapFeedback(row: Record<string, unknown> & { profiles?: Record<string, unknown> | null }) {
  const profile = row.profiles as { display_name?: string | null } | null | undefined;
  return {
    id: row.id as string,
    message: row.message as string,
    createdAt: row.created_at as string,
    authorName: profile?.display_name ?? null,
  };
}

export function mapOrder(row: Record<string, unknown> & { branches?: Record<string, unknown> }) {
  return {
    id: row.id as string,
    number: row.number as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    totalPrice: row.total_price as number,
    status: row.status as string,
    createdAt: row.created_at as string,
    paidAt: (row.paid_at as string | null | undefined) ?? null,
    statusSource: (row.status_source as string | null | undefined) ?? null,
    statusChangedAt: (row.status_changed_at as string | null | undefined) ?? null,
    branch: row.branches ? mapBranch(row.branches) : null,
    originalTotal: (row.original_total as number | null | undefined) ?? null,
    editedAt: (row.edited_at as string | null | undefined) ?? null,
    editedBy: (row.edited_by as string | null | undefined) ?? null,
    items: row.items_json as OrderItem[],
  };
}
