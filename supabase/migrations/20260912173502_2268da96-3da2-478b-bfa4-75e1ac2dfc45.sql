CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_packages_tracking_code_trgm
  ON public.packages USING gin (lower(tracking_code) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_packages_condominium_received_at
  ON public.packages (condominium_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_packages_condominium_status
  ON public.packages (condominium_id, status);