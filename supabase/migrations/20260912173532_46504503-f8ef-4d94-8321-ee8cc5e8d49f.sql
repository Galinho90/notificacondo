CREATE INDEX IF NOT EXISTS idx_packages_tracking_code_trgm_plain
  ON public.packages USING gin (tracking_code gin_trgm_ops);

DROP INDEX IF EXISTS public.idx_packages_tracking_code_trgm;