-- TradeMind AI Database Schema for Neon PostgreSQL

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  plan VARCHAR(32) NOT NULL DEFAULT 'Free',
  stripe_subscription_id VARCHAR(255) DEFAULT '',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,
  verification_code_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schema Migrations for existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_last_sent_at TIMESTAMPTZ;

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  type VARCHAR(16) NOT NULL,
  entry NUMERIC(16, 6) NOT NULL,
  exit NUMERIC(16, 6) NOT NULL,
  size NUMERIC(16, 6) NOT NULL,
  pnl NUMERIC(16, 2) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chart Analyses Table
CREATE TABLE IF NOT EXISTS analyses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(64) NOT NULL DEFAULT '',
  trend VARCHAR(64) NOT NULL DEFAULT '',
  recommendation VARCHAR(64) NOT NULL DEFAULT '',
  support VARCHAR(64) NOT NULL DEFAULT '',
  resistance VARCHAR(64) NOT NULL DEFAULT '',
  entry VARCHAR(64) NOT NULL DEFAULT '',
  stop_loss VARCHAR(64) NOT NULL DEFAULT '',
  take_profit1 VARCHAR(64) NOT NULL DEFAULT '',
  take_profit2 VARCHAR(64) NOT NULL DEFAULT '',
  take_profit VARCHAR(64) NOT NULL DEFAULT '',
  risk_reward_ratio VARCHAR(64) NOT NULL DEFAULT '',
  confidence_score INTEGER NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT NOT NULL DEFAULT '',
  bullish_probability INTEGER NOT NULL DEFAULT 0,
  pattern_detected VARCHAR(255) NOT NULL DEFAULT '',
  indicator_explanation TEXT NOT NULL DEFAULT '',
  market_sentiment VARCHAR(64) NOT NULL DEFAULT '',
  risk_level VARCHAR(64) NOT NULL DEFAULT '',
  educational_explanation TEXT NOT NULL DEFAULT '',
  ai_model_used VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL,
  condition VARCHAR(16) NOT NULL,
  value NUMERIC(16, 6) NOT NULL,
  triggered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
