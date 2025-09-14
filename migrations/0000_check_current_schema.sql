-- Check current schema to see what columns actually exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'vouchers', 'expenses')
ORDER BY table_name, ordinal_position;
