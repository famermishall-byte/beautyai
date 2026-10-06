import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import type { HomeSlide, OrderItem, Product, SlideAction } from "@/types";

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
    barcode: (row.barcode as string | null) ?? null,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as string,
    price: row.price as number,
    description: row.description as string | null,
    characteristics: row.characteristics as string | null,
    purpose: row.purpose as string | null,
    nameKy: (row.name_ky as string | null) ?? null,
    descriptionKy: (row.description_ky as string | null) ?? null,
    characteristicsKy: (row.characteristics_ky as string | null) ?? null,
    purposeKy: (row.purpose_ky as string | null) ?? null,
    inStock: row.in_stock as boolean,
    imageUrl: row.image_url as string | null,
    attributes: row.attributes ?? undefined,
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

export function mapFeedback(
  row: Record<string, unknown> & { profiles?: Record<string, unknown> | null; branches?: Record<string, unknown> | null }
) {
  const profile = row.profiles as { display_name?: string | null } | null | undefined;
  const branch = row.branches as { name?: string | null } | null | undefined;
  return {
    id: row.id as string,
    message: row.message as string,
    createdAt: row.created_at as string,
    // author_* / contact_phone — снимок при отправке (профили клиентов сотрудникам не видны); у старых сообщений их нет.
    authorName: (row.author_name as string | null) ?? profile?.display_name ?? null,
    authorEmail: (row.author_email as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    branchName: branch?.name ?? null,
  };
}

/**
 * Колонки заказа, которые видны сессии пользователя (покупателю, сотрудникам). Секретные ссылки заказа —
 * `status_token` (продавец) и `courier_token` (курьер) — сюда НЕ входят: в базе на них отозвано право чтения
 * (supabase/order_tokens_private.sql), иначе покупатель мог бы сам вызвать функции продавца/курьера и отметить свой
 * заказ оплаченным. Поэтому `select("*")` по заказам не использовать. Новая колонка в `orders` = добавить сюда
 * И в GRANT SELECT в SQL.
 */
// Одной литеральной строкой (а не .join): клиент Supabase разбирает тип ответа по тексту запроса.
export const ORDER_COLUMNS =
  "id, store_id, user_id, branch_id, number, legacy_number, status, total_price, original_total, is_wholesale, customer_name, customer_phone, items_json, created_at, paid_at, shipped_at, delivered_at, status_source, status_changed_at, edited_at, edited_by, stock_reserved, delivery_method, delivery_address, delivery_time, courier_phone" as const;
/** Заказ вместе с филиалом — вместо `select("*, branches(*)")`. */
export const ORDER_SELECT = `${ORDER_COLUMNS}, branches(*)` as const;

export function mapOrder(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    number: row.number as string,
    legacyNumber: (row.legacy_number as string | null | undefined) ?? null,
    isWholesale: row.is_wholesale === true,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    totalPrice: row.total_price as number,
    status: row.status as string,
    createdAt: row.created_at as string,
    paidAt: (row.paid_at as string | null | undefined) ?? null,
    statusSource: (row.status_source as string | null | undefined) ?? null,
    statusChangedAt: (row.status_changed_at as string | null | undefined) ?? null,
    branch: row.branches ? mapBranch(row.branches as Record<string, unknown>) : null,
    originalTotal: (row.original_total as number | null | undefined) ?? null,
    editedAt: (row.edited_at as string | null | undefined) ?? null,
    editedBy: (row.edited_by as string | null | undefined) ?? null,
    items: row.items_json as OrderItem[],
    stockReserved: row.stock_reserved === true,
    // До миграции supabase/order_delivery.sql колонок нет — все заказы считаются самовывозом.
    deliveryMethod: row.delivery_method === "delivery" ? ("delivery" as const) : ("pickup" as const),
    deliveryAddress: (row.delivery_address as string | null | undefined) ?? null,
    deliveryTime: (row.delivery_time as string | null | undefined) ?? null,
    courierPhone: (row.courier_phone as string | null | undefined) ?? null,
    deliveredAt: (row.delivered_at as string | null | undefined) ?? null,
  };
}

export function mapNewArrival(
  row: Record<string, unknown> & { products?: Record<string, unknown> | null }
) {
  const product = row.products as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    productId: row.product_id as string,
    priority: row.priority as number,
    createdAt: row.created_at as string,
    product: product
      ? {
          id: product.id as string,
          name: product.name as string,
          brand: product.brand as string,
          imageUrl: (product.image_url as string | null) ?? null,
          price: product.price as number,
        }
      : null,
  };
}

export function mapHomeSlide(row: Record<string, unknown>, product: Product | null): HomeSlide {
  return {
    id: row.id as string,
    mediaType: row.media_type as "image" | "video",
    imageUrl: (row.image_url as string | null) ?? null,
    videoUrl: (row.video_url as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    subtitle: (row.subtitle as string | null) ?? null,
    action: row.action as SlideAction,
    productId: (row.product_id as string | null) ?? null,
    placement: row.placement === "inline" ? "inline" : "hero",
    category: (row.link_category as string | null) ?? null,
    priority: row.priority as number,
    active: row.active as boolean,
    product,
  };
}

export function mapBanner(
  row: Record<string, unknown> & { products?: Record<string, unknown> | null }
) {
  const product = row.products as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    productId: (row.product_id as string | null) ?? null,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    videoUrl: (row.video_url as string | null) ?? null,
    buttonText: (row.button_text as string | null) ?? null,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    status: row.status as "draft" | "active" | "disabled",
    priority: row.priority as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    product: product
      ? {
          id: product.id as string,
          name: product.name as string,
          brand: product.brand as string,
          imageUrl: (product.image_url as string | null) ?? null,
          price: product.price as number,
        }
      : null,
  };
}

export function mapProductReview(row: Record<string, unknown>, authorName: string | null, currentUserId: string | null) {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    userId: row.user_id as string,
    orderId: row.order_id as string,
    rating: row.rating as number,
    comment: (row.comment as string | null) ?? null,
    createdAt: row.created_at as string,
    authorName,
    isOwn: currentUserId !== null && row.user_id === currentUserId,
  };
}

export function mapPromotion(
  row: Record<string, unknown> & { products?: Record<string, unknown> | null }
) {
  const product = row.products as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    productId: (row.product_id as string | null) ?? null,
    title: row.title as string,
    discountType: row.discount_type as "percent" | "fixed" | "special_price",
    discountValue: (row.discount_value as number | null) ?? null,
    oldPrice: row.old_price as number,
    newPrice: row.new_price as number,
    showOldPrice: row.show_old_price as boolean,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    status: row.status as "draft" | "active" | "disabled",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    product: product
      ? {
          id: product.id as string,
          name: product.name as string,
          brand: product.brand as string,
          imageUrl: (product.image_url as string | null) ?? null,
          price: product.price as number,
        }
      : null,
  };
}
