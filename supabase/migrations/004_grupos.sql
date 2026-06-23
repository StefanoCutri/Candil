-- Grupos de estudio (Plus)
-- Acceso vía API con service role (server valida auth + membresía).
-- RLS habilitado sin policies públicas => el cliente anon/auth no puede tocar estas tablas directo.

CREATE TABLE IF NOT EXISTS grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE DEFAULT upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6)),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupo_miembros (
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (grupo_id, user_id)
);

CREATE TABLE IF NOT EXISTS grupo_planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (grupo_id, plan_id)
);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_planes ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
