SELECT EXISTS (
  SELECT 1
  FROM schema_migrations
  WHERE name = '0001_platform_baseline.sql'
    AND char_length(checksum) = 64
) AS ok;