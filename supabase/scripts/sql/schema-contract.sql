-- Emits a JSON document describing facts about the public schema that the TypeScript types cannot carry:
-- the allowed values of single-column CHECK (col IN (...)) constraints and varchar lengths.
-- The Zod schemas in packages/validation are tested against this snapshot so they cannot drift from the DB.
SELECT jsonb_pretty(jsonb_build_object(
  'enums', (
    SELECT coalesce(jsonb_object_agg(k, vals ORDER BY k), '{}'::jsonb) FROM (
      SELECT c.relname || '.' || a.attname AS k,
             (SELECT jsonb_agg(m[1] ORDER BY m[1])
                FROM regexp_matches(pg_get_constraintdef(con.oid), '''([^'']*)''::', 'g') AS m) AS vals
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
       WHERE con.contype = 'c' AND cardinality(con.conkey) = 1
         AND pg_get_constraintdef(con.oid) ~ 'ARRAY\['
    ) s
  ),
  'maxLengths', (
    SELECT coalesce(jsonb_object_agg(table_name || '.' || column_name, character_maximum_length ORDER BY table_name, column_name), '{}'::jsonb)
      FROM information_schema.columns
     WHERE table_schema = 'public' AND character_maximum_length IS NOT NULL
  )
));
