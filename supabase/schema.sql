-- Ejecutar en el SQL Editor de Supabase

-- Usuarios (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  nombre TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (new.id, new.raw_user_meta_data->>'nombre');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Examenes
CREATE TABLE IF NOT EXISTS examenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  tipo TEXT,
  fecha DATE NOT NULL,
  hora TIME,
  preferencia_horario TEXT,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE examenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own examenes" ON examenes FOR ALL USING (auth.uid() = user_id);

-- Temas
CREATE TABLE IF NOT EXISTS temas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ya_lo_se BOOLEAN DEFAULT FALSE,
  peso INTEGER,
  orden INTEGER
);

ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own temas" ON temas FOR ALL
  USING (examen_id IN (SELECT id FROM examenes WHERE user_id = auth.uid()));

-- Disponibilidad
CREATE TABLE IF NOT EXISTS disponibilidad (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
  dia TEXT NOT NULL,
  horas NUMERIC DEFAULT 0,
  bloqueado BOOLEAN DEFAULT FALSE
);

ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own disponibilidad" ON disponibilidad FOR ALL
  USING (examen_id IN (SELECT id FROM examenes WHERE user_id = auth.uid()));

-- Planes
CREATE TABLE IF NOT EXISTS planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
  contenido JSONB NOT NULL,
  token_publico TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own planes" ON planes FOR ALL
  USING (examen_id IN (SELECT id FROM examenes WHERE user_id = auth.uid()));
-- Lectura pública por token
CREATE POLICY "Anyone can read plan by token" ON planes FOR SELECT USING (true);

-- Bloques
CREATE TABLE IF NOT EXISTS bloques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE,
  dia DATE,
  hora_inicio TIME,
  hora_fin TIME,
  tema TEXT,
  tipo TEXT,
  completado BOOLEAN DEFAULT FALSE,
  orden INTEGER
);

ALTER TABLE bloques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own bloques" ON bloques FOR ALL
  USING (plan_id IN (
    SELECT p.id FROM planes p
    JOIN examenes e ON p.examen_id = e.id
    WHERE e.user_id = auth.uid()
  ));
