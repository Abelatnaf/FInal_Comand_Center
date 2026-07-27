-- Restore security definer -- the previous migration accidentally flipped
-- this to security invoker while fixing the numeric/bigint cast, which
-- would have made the function useless for anonymous share-link visitors
-- (RLS would block anon from ever resolving the token or reading the
-- owner's data; security definer is what makes the narrow, explicit
-- v_user_id-scoped queries inside this function work at all for anon).
alter function public.get_shared_snapshot(text) security definer;
