-- supabase/migrations/20250914040832_multi_organization.sql

-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Remove organization_id from users table
ALTER TABLE users DROP COLUMN IF EXISTS organization_id CASCADE;

-- Step 2: Create organization_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, manager, agent, viewer
  
  -- Invitation tracking
  invited_by UUID REFERENCES users(id),
  invitation_token VARCHAR(255),
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  invitation_accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT false, -- false until invitation accepted
  is_default BOOLEAN DEFAULT false, -- default organization for user
  
  -- Metadata
  permissions JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one user can only have one role per organization
  UNIQUE(organization_id, user_id)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_token ON organization_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(is_active);

-- Step 4: Add last_accessed_organization to users for quick access
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_accessed_organization_id UUID REFERENCES organizations(id);

-- Step 5: Create invitations table for better tracking
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Invitation details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  
  -- Tracking
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, cancelled
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  message TEXT,
  permissions JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON organization_invitations(status);

-- Step 6: Update RLS policies for organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can update their membership settings" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organization memberships" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can update their own membership settings (not role)
CREATE POLICY "Users can update their membership settings" ON organization_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage organization members
CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Invitations policies
CREATE POLICY "Users can view invitations sent to them" ON organization_invitations
  FOR SELECT USING (
    email IN (SELECT email FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage invitations" ON organization_invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Step 7: Update existing tables to reference organization properly
-- Update teams to check organization membership
DROP POLICY IF EXISTS "Users can view teams in their organization" ON teams;
CREATE POLICY "Users can view teams in their organization" ON teams
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Update customers policy
DROP POLICY IF EXISTS "Users can view customers in their organization" ON customers;
CREATE POLICY "Users can view customers in their organization" ON customers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Update conversations policy
DROP POLICY IF EXISTS "Users can view conversations in their organization" ON conversations;
CREATE POLICY "Users can view conversations in their organization" ON conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Step 8: Helper functions
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR,
  organization_slug VARCHAR,
  user_role VARCHAR,
  is_default BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    om.is_default,
    om.joined_at
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.is_active = true
  ORDER BY om.is_default DESC, om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set default organization
CREATE OR REPLACE FUNCTION set_default_organization(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Reset all defaults for this user
  UPDATE organization_members
  SET is_default = false
  WHERE user_id = p_user_id;
  
  -- Set new default
  UPDATE organization_members
  SET is_default = true
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND is_active = true;
    
  -- Update last accessed
  UPDATE users
  SET last_accessed_organization_id = p_organization_id
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  p_user_id UUID,
  p_org_name VARCHAR,
  p_org_slug VARCHAR,
  p_org_industry VARCHAR DEFAULT NULL,
  p_org_size VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, slug, industry, size)
  VALUES (p_org_name, p_org_slug, p_org_industry, p_org_size)
  RETURNING id INTO v_org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (
    organization_id, 
    user_id, 
    role, 
    is_active, 
    is_default,
    invitation_accepted_at
  )
  VALUES (
    v_org_id, 
    p_user_id, 
    'owner', 
    true, 
    true,
    NOW()
  );
  
  -- Set as last accessed
  UPDATE users
  SET last_accessed_organization_id = v_org_id
  WHERE id = p_user_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger function exists before creating triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_organization_invitations_updated_at ON organization_invitations;
CREATE TRIGGER update_organization_invitations_updated_at 
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();