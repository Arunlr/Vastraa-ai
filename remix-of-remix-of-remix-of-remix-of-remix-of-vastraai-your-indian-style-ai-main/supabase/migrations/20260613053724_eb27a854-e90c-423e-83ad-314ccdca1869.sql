ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone insert ai usage" ON public.ai_usage;
CREATE POLICY "Insert own ai usage" ON public.ai_usage FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());