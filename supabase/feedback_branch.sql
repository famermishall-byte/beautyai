-- ОТЗЫВЫ ПО ФИЛИАЛАМ: вместо WhatsApp отзыв остаётся внутри приложения и виден
-- управляющему того филиала, который выбрал клиент; админ/владелец видят все отзывы магазина.
-- Безопасно: только ДОБАВЛЯЕТ колонку и политики; существующие отзывы не меняются. Можно запускать повторно.
-- Запустить в Supabase → SQL Editor (страницу не переводить переводчиком браузера!).

alter table public.feedback add column if not exists branch_id uuid references public.branches(id) on delete set null;

-- Управляющий филиала видит только отзывы своего филиала (правило добавляется к уже существующим
-- feedback_select_own и feedback_select_store_manager — они остаются как есть).
drop policy if exists feedback_select_branch_manager on public.feedback;
create policy feedback_select_branch_manager on public.feedback
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'branch_manager'
      and p.branch_id = feedback.branch_id and p.store_id = feedback.store_id));
