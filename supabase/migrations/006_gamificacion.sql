-- Gamificación: logros, nivel y XP en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logros JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT 'vela_nueva';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
