CREATE INDEX IF NOT EXISTS idx_packages_condominium_tracking_code
  ON public.packages (condominium_id, tracking_code);