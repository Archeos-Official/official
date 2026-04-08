-- ArcheOS Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table (discoveries/archaeological finds)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    location_name TEXT,
    notes TEXT,
    discovery_date DATE,
    depth_found TEXT,
    soil_type TEXT,
    condition TEXT,
    detection_method TEXT,
    material TEXT,
    image_url TEXT,
    additional_images TEXT[],
    ai_identification JSONB,
    storage_instructions JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'pending_analysis',
    finder_name TEXT,
    created_by TEXT,
    updated_by TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    is_archaeological BOOLEAN DEFAULT TRUE,
    appeal_status TEXT DEFAULT 'none',
    reported_to_government BOOLEAN DEFAULT FALSE,
    report_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experts table
CREATE TABLE IF NOT EXISTS experts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialization TEXT,
    institution TEXT,
    bio TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Government Reports table
CREATE TABLE IF NOT EXISTS government_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    reference_number TEXT,
    object_description TEXT,
    find_date DATE,
    location_description TEXT,
    coordinates TEXT,
    finder_name TEXT,
    finder_contact TEXT,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Logs table (AI usage tracking)
CREATE TABLE IF NOT EXISTS credit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    discovery_name TEXT,
    credits_used DECIMAL(10,2) DEFAULT 1,
    operation_type TEXT DEFAULT 'ai_analysis',
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_private ON projects(is_private);
CREATE INDEX IF NOT EXISTS idx_projects_is_archaeological ON projects(is_archaeological);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experts_created_by ON experts(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON government_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_discovery_id ON government_reports(discovery_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_created_at ON credit_logs(created_at DESC);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read for non-private projects (for community page)
CREATE POLICY "Public projects are viewable by everyone"
    ON projects FOR SELECT
    USING (is_private = FALSE AND is_archaeological = TRUE);

-- Users can view their own private projects
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid()::TEXT = created_by);

-- Anyone can insert projects (guests can submit too)
CREATE POLICY "Anyone can create projects"
    ON projects FOR INSERT
    WITH CHECK (true);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid()::TEXT = created_by);

-- Only admins can delete
CREATE POLICY "Only admins can delete projects"
    ON projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Experts: public read
CREATE POLICY "Experts are viewable by everyone"
    ON experts FOR SELECT
    USING (true);

-- Users can manage their own experts
CREATE POLICY "Users can manage their own experts"
    ON experts FOR ALL
    USING (auth.uid()::TEXT = created_by);

-- Reports: users can view their own
CREATE POLICY "Users can view their own reports"
    ON government_reports FOR SELECT
    USING (auth.uid()::TEXT = created_by);

-- Users can create reports
CREATE POLICY "Users can create reports"
    ON government_reports FOR INSERT
    WITH CHECK (auth.uid()::TEXT = created_by);

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
    ON government_reports FOR UPDATE
    USING (auth.uid()::TEXT = created_by);

-- Credit logs: admins only
CREATE POLICY "Admins can view all credit logs"
    ON credit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Anyone can create credit logs (for tracking)
CREATE POLICY "Anyone can create credit logs"
    ON credit_logs FOR INSERT
    WITH CHECK (true);

-- Profiles: users can view their own
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow insert for authenticated users (needed for trigger)
CREATE POLICY "Authenticated users can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Functions

-- Function to handle new user signup (improved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name_text TEXT;
BEGIN
    -- Get full_name from metadata, default to email if not provided
    full_name_text := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
    
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, full_name_text);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix: Create profiles for existing users who don't have one
INSERT INTO profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_experts_updated_at ON experts;
CREATE TRIGGER update_experts_updated_at
    BEFORE UPDATE ON experts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_government_reports_updated_at ON government_reports;
CREATE TRIGGER update_government_reports_updated_at
    BEFORE UPDATE ON government_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check what's in auth.users:
SELECT id, email, created_at FROM auth.users;

-- Check what's in profiles:
SELECT * FROM profiles;
INSERT INTO storage.buckets (id, name, public) VALUES ('discoveries', 'discoveries', true)
ON CONFLICT (id) DO NOTHING;
