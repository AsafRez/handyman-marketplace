-- HandyHub Relational Database Schema (PostgreSQL / Supabase Ready)

-- 0. Regions in Israel
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- 0.5. Cities in Israel
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE
);

-- 1. Users Table (Shared by customers and providers)
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table (Service Trade Specialties)
CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL
);

-- 3. Providers Table (One row per user + trade combination; a user can offer multiple trades)
CREATE TABLE IF NOT EXISTS providers (
  provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  verified BOOLEAN DEFAULT TRUE,
  preferred_region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- 4. Jobs Table (Doubles as job history & active dispatch queue)
CREATE TABLE IF NOT EXISTS jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(provider_id) ON DELETE SET NULL,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed', 'cancelled')),
  cancel_reason TEXT,
  cancelled_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Initial Roles Data
INSERT INTO roles (role_id, role_name) VALUES
  (1, 'Electrician'),
  (2, 'Plumber'),
  (3, 'Locksmith'),
  (4, 'HVAC & AC Repair'),
  (5, 'Carpenter'),
  (6, 'Painter')
ON CONFLICT (role_id) DO NOTHING;

-- 5. Row Level Security (RLS) & Access Control Policies
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access via anon publishable key for app sync
DROP POLICY IF EXISTS "Public access on regions" ON regions;
CREATE POLICY "Public access on regions" ON regions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on cities" ON cities;
CREATE POLICY "Public access on cities" ON cities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on users" ON users;
CREATE POLICY "Public access on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on roles" ON roles;
CREATE POLICY "Public access on roles" ON roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on providers" ON providers;
CREATE POLICY "Public access on providers" ON providers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on jobs" ON jobs;
CREATE POLICY "Public access on jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);

