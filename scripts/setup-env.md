# Environment Setup Guide

## Required Environment Variables

For the PDSN Expense Manager to work properly, you need to set the following environment variables in your Vercel deployment:

### Supabase Configuration

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

### Database Configuration (Optional)

- `DATABASE_URL` - Direct database connection string (if using Drizzle ORM)
- `SUPABASE_DB_URL` - Supabase database connection string

## Setting up Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `scripts/setup-database.sql`
4. This will create all necessary tables and set up Row Level Security (RLS)

## Testing the Setup

After setting up the environment variables and database:

1. Deploy your application to Vercel
2. Test the health endpoints:
   - `GET /api/health` - Basic health check
   - `GET /api/health/db` - Database connection test
3. Try logging in and accessing the vouchers endpoint

## Troubleshooting

If you're still getting 500 errors:

1. Check the Vercel function logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the database tables exist (run the SQL script)
4. Check that RLS policies are properly configured
5. Verify the service role key has the correct permissions
