# Travel Expense Management System

A professional travel expense management application built with React, Express.js, and PostgreSQL (Supabase).

## Features

- **User Authentication**: Email/password authentication system
- **Travel Vouchers**: Create and manage travel expense vouchers
- **Expense Tracking**: Track different types of transportation costs
- **Department Management**: Organize expenses by department
- **Modern UI**: Built with React, Tailwind CSS, and Shadcn/ui components

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with Supabase
- **ORM**: Drizzle ORM
- **Authentication**: Traditional email/password with sessions
- **Styling**: Tailwind CSS + Radix UI components

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TEA
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Database Connection (use either DATABASE_URL or SUPABASE_DB_URL)
DATABASE_URL=postgresql://username:password@host:port/database
# OR
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Secret (generate a random string)
SESSION_SECRET=your_session_secret_here
```

### 4. Set Up Supabase Database
1. Create a new project on [Supabase](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Use the connection string from your database settings
4. Run database migrations: `npm run db:push`

### 5. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## Database Schema

- **Users**: User accounts with email/password authentication
- **Sessions**: User authentication sessions
- **Vouchers**: Travel expense vouchers with date ranges and status
- **Expenses**: Individual expense items with transport categorization

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── attached_assets/ # Static assets
```

## Recent Changes

- ✅ Migrated from Neon to Supabase database
- ✅ Removed all Replit-specific configurations
- ✅ Updated to use Supabase client and postgres driver
- ✅ Fixed Windows compatibility issues
- ✅ Cleaned up package.json dependencies

## Support

For issues or questions, please check the project documentation or create an issue in the repository.
