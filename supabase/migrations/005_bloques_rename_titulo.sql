-- 005 — Alinear la tabla "bloques" con el código de la app.
--
-- La tabla desplegada quedó con la columna del título llamada "titulo",
-- pero todo el código (generar-plan, ajustar-plan, plan/[id]) usa "tema".
-- Eso hacía que el INSERT de bloques fallara con:
--   PGRST204: Could not find the 'tema' column of 'bloques' in the schema cache
-- y el plan se guardaba sin ningún bloque.
--
-- Renombramos titulo -> tema para que TODO el código funcione sin cambios.
-- (descripcion y duracion_minutos ya existen en la tabla y se conservan.)

ALTER TABLE bloques RENAME COLUMN titulo TO tema;

-- Recargar el schema cache de PostgREST para que el rename se vea de inmediato.
NOTIFY pgrst, 'reload schema';
