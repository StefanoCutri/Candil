-- Racha de días de estudio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS racha_dias INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mejor_racha INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ultima_actividad DATE;

NOTIFY pgrst, 'reload schema';
