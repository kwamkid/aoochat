-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  settings JSONB DEFAULT '{}',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE (extends Supabase Auth)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'agent', -- admin, manager, agent, viewer
  phone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'th',
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- =====================================================
-- PLATFORM ACCOUNTS TABLE
-- =====================================================
CREATE TABLE platform_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- facebook, instagram, line, whatsapp, etc.
  account_name VARCHAR(255),
  account_id VARCHAR(255),
  account_username VARCHAR(255),
  account_avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  webhook_secret TEXT,
  webhook_url TEXT,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, platform, account_id)
);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  
  -- Demographics
  birth_date DATE,
  gender VARCHAR(20),
  language VARCHAR(10),
  timezone VARCHAR(50),
  country VARCHAR(2),
  city VARCHAR(100),
  
  -- Platform Identities
  platform_identities JSONB DEFAULT '{}',
  
  -- Behavioral Metrics
  first_contact_at TIMESTAMP WITH TIME ZONE,
  last_contact_at TIMESTAMP WITH TIME ZONE,
  total_conversations INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  avg_response_time INTERVAL,
  preferred_platform VARCHAR(50),
  preferred_contact_time JSONB,
  
  -- E-commerce Metrics
  lifetime_value DECIMAL(15,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  avg_order_value DECIMAL(15,2) DEFAULT 0,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  abandoned_carts INT DEFAULT 0,
  
  -- Scoring
  engagement_score INT DEFAULT 50,
  purchase_intent_score INT DEFAULT 50,
  churn_risk_score INT DEFAULT 50,
  satisfaction_score INT DEFAULT 50,
  influencer_score INT DEFAULT 0,
  
  -- Custom Fields
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  -- System
  merged_with UUID REFERENCES customers(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  platform_account_id UUID REFERENCES platform_accounts(id) ON DELETE CASCADE,
  
  -- Conversation Info
  platform VARCHAR(50) NOT NULL,
  platform_conversation_id VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'open', -- new, open, pending, resolved, spam
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  channel_type VARCHAR(50), -- direct_message, comment, review, email
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  first_response_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_time INTERVAL,
  message_count INT DEFAULT 0,
  unread_count INT DEFAULT 0,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  sla_deadline TIMESTAMP WITH TIME ZONE,
  
  -- System
  is_archived BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Message Info
  platform_message_id VARCHAR(255),
  sender_type VARCHAR(20) NOT NULL, -- customer, agent, system, bot
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  sender_avatar TEXT,
  
  -- Content
  message_type VARCHAR(50) DEFAULT 'text',
  content JSONB NOT NULL,
  
  -- Metadata
  is_private BOOLEAN DEFAULT false,
  is_automated BOOLEAN DEFAULT false,
  sentiment VARCHAR(20),
  language VARCHAR(10),
  translated_content JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'sent',
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- System
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_conversations_organization ON conversations(organization_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users policies
CREATE POLICY "Users can view users in their organization" ON users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view conversations in their organization" ON conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their organization" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();