-- Fix: el código usa la columna `tipo` (TEXT) pero la DB en vivo
-- quedó con `tipos`. Renombramos si hace falta y refrescamos el
-- schema cache de PostgREST para evitar el error
-- "Could not find the 'tipo' column of 'examenes' in the schema cache".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'examenes' AND column_name = 'tipos'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'examenes' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE examenes RENAME COLUMN tipos TO tipo;
    -- Si era TEXT[] lo aplanamos a TEXT (el código guarda tipos.join(', ')).
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'examenes' AND column_name = 'tipo') = 'ARRAY' THEN
      ALTER TABLE examenes ALTER COLUMN tipo TYPE TEXT USING array_to_string(tipo, ', ');
    END IF;
  END IF;

  -- Si no existe ninguna de las dos, la creamos.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'examenes' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE examenes ADD COLUMN tipo TEXT;
  END IF;
END $$;

-- Refrescar el schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
