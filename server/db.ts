import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';

// Load secrets & database configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production';
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'dev_password_pepper_change_in_production';
const DATABASE_URL = process.env.DATABASE_URL;

// Startup check for production environment
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment');
  }
  if (!process.env.PASSWORD_PEPPER) {
    throw new Error('FATAL: PASSWORD_PEPPER environment variable is missing in production environment');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('FATAL: DATABASE_URL environment variable is missing in production environment');
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error('FATAL: RESEND_API_KEY environment variable is missing in production environment');
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  stripeSubscriptionId?: string;
  emailVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: 'Buy' | 'Sell';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  notes: string;
  createdAt?: string;
}

export interface ChartAnalysis {
  id: string;
  ticker: string;
  trend: string;
  support: string;
  resistance: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  takeProfit1?: string;
  takeProfit2?: string;
  recommendation?: string;
  riskRewardRatio: string;
  confidenceScore: number;
  reasons?: string[];
  reasoning: string;
  bullishProbability: number;
  patternDetected: string;
  indicatorExplanation: string;
  marketSentiment: string;
  riskLevel: string;
  educationalExplanation: string;
  timestamp: string;
  aiModelUsed?: string;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  value: number;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

class SaaSStore {
  private pool: Pool | null = null;

  constructor() {
    if (DATABASE_URL) {
      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      });
      this.autoMigrateSchema().catch(err => {
        console.error('Failed to auto-migrate database schema on startup:', err);
      });
    } else {
      console.warn('DATABASE_URL not set. SaaSStore operating in fallback/mock mode.');
    }
  }

  private async autoMigrateSchema() {
    if (!this.pool) return;
    try {
      const schemaPath = path.resolve('schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(schemaSql);
      }
    } catch (err) {
      console.error('Schema initialization warning:', err);
    }
  }

  // --- Synchronous Pure Cryptographic Utilities ---
  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public hashPassword(password: string, salt: string): string {
    const combinedSalt = `${salt}:${PASSWORD_PEPPER}`;
    return crypto.scryptSync(password, combinedSalt, 64).toString('hex');
  }

  public generateToken(userId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  public verifyToken(token: string): string | null {
    try {
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) return null;

      const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
      if (signature !== expectedSignature) return null;

      const decryptedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decryptedPayload.exp < Date.now()) return null;

      return decryptedPayload.userId;
    } catch {
      return null;
    }
  }

  // --- Parameterized Asynchronous Postgres User Operations ---
  public async getUserByEmail(email: string): Promise<User | null> {
    if (!this.pool) return null;
    const res = await this.pool.query(
      `SELECT id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
              plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
              verification_code AS "verificationCode", verification_code_expires_at AS "verificationCodeExpiresAt",
              created_at AS "createdAt"
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return res.rows[0] || null;
  }

  public async getUserById(id: string): Promise<User | null> {
    if (!this.pool) return null;
    const res = await this.pool.query(
      `SELECT id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
              plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
              verification_code AS "verificationCode", verification_code_expires_at AS "verificationCodeExpiresAt",
              created_at AS "createdAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async createUser(name: string, email: string, passwordHash: string, passwordSalt: string): Promise<User> {
    if (!this.pool) throw new Error('Database pool not initialized. Configure DATABASE_URL.');
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const res = await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash, password_salt, plan, email_verified, verification_code, verification_code_expires_at, verification_code_last_sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Free', false, $6, $7, NOW(), NOW())
       RETURNING id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
                 plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
                 verification_code AS "verificationCode", verification_code_expires_at AS "verificationCodeExpiresAt",
                 created_at AS "createdAt"`,
      [id, name, email, passwordHash, passwordSalt, verificationCode, verificationCodeExpiresAt]
    );
    return res.rows[0];
  }

  public async verifyEmailCode(userIdOrEmail: string, code: string): Promise<{ success: boolean; message: string; user?: User }> {
    if (!this.pool) return { success: false, message: 'Database connection uninitialized' };
    const userRes = await this.pool.query(
      `SELECT id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
              plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
              verification_code AS "verificationCode", verification_code_expires_at AS "verificationCodeExpiresAt",
              created_at AS "createdAt"
       FROM users WHERE id = $1 OR LOWER(email) = LOWER($1)`,
      [userIdOrEmail]
    );

    const user = userRes.rows[0];
    if (!user) {
      return { success: false, message: 'User account not found' };
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email address is already verified', user };
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      return { success: false, message: 'Invalid 6-digit verification code' };
    }

    if (user.verificationCodeExpiresAt && new Date(user.verificationCodeExpiresAt) < new Date()) {
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    const updateRes = await this.pool.query(
      `UPDATE users
       SET email_verified = true, verification_code = NULL, verification_code_expires_at = NULL
       WHERE id = $1
       RETURNING id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
                 plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
                 created_at AS "createdAt"`,
      [user.id]
    );

    return {
      success: true,
      message: 'Email verified successfully',
      user: updateRes.rows[0]
    };
  }

  public async regenerateVerificationCode(userIdOrEmail: string): Promise<{ success: boolean; message: string; code?: string; user?: User; retryAfter?: number }> {
    if (!this.pool) return { success: false, message: 'Database connection uninitialized' };
    
    const userRes = await this.pool.query(
      `SELECT id, name, email, email_verified AS "emailVerified", 
              verification_code_last_sent_at AS "lastSentAt"
       FROM users WHERE id = $1 OR LOWER(email) = LOWER($1)`,
      [userIdOrEmail]
    );

    const user = userRes.rows[0];
    if (!user) {
      return { success: false, message: 'User account not found' };
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email address is already verified' };
    }

    if (user.lastSentAt) {
      const timeSinceLastSent = Date.now() - new Date(user.lastSentAt).getTime();
      if (timeSinceLastSent < 60000) {
        const remaining = Math.ceil((60000 - timeSinceLastSent) / 1000);
        return {
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new verification code.`,
          retryAfter: remaining
        };
      }
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const updateRes = await this.pool.query(
      `UPDATE users
       SET verification_code = $2, verification_code_expires_at = $3, verification_code_last_sent_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
                 plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
                 verification_code AS "verificationCode", verification_code_expires_at AS "verificationCodeExpiresAt",
                 created_at AS "createdAt"`,
      [user.id, newCode, newExpiresAt]
    );

    return {
      success: true,
      message: 'New verification code generated',
      code: newCode,
      user: updateRes.rows[0]
    };
  }

  public async updateUserPlan(userId: string, plan: 'Free' | 'Pro' | 'Enterprise', stripeSubscriptionId?: string): Promise<User | null> {
    if (!this.pool) return null;
    const res = await this.pool.query(
      `UPDATE users
       SET plan = $2, stripe_subscription_id = COALESCE($3, stripe_subscription_id)
       WHERE id = $1
       RETURNING id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt", 
                 plan, stripe_subscription_id AS "stripeSubscriptionId", email_verified AS "emailVerified",
                 created_at AS "createdAt"`,
      [userId, plan, stripeSubscriptionId || '']
    );
    return res.rows[0] || null;
  }

  // --- Parameterized Asynchronous Postgres Trade Operations ---
  public async getTrades(userId: string): Promise<Trade[]> {
    if (!this.pool) return [];
    const res = await this.pool.query(
      `SELECT id, date, symbol, type, entry::float, exit::float, size::float, pnl::float, notes, created_at AS "createdAt"
       FROM trades WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  public async addTrade(userId: string, tradeData: Omit<Trade, 'id'>): Promise<Trade> {
    if (!this.pool) throw new Error('Database pool not initialized.');
    const id = 'trd_' + crypto.randomBytes(8).toString('hex');
    const res = await this.pool.query(
      `INSERT INTO trades (id, user_id, date, symbol, type, entry, exit, size, pnl, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id, date, symbol, type, entry::float, exit::float, size::float, pnl::float, notes, created_at AS "createdAt"`,
      [id, userId, tradeData.date, tradeData.symbol, tradeData.type, tradeData.entry, tradeData.exit, tradeData.size, tradeData.pnl, tradeData.notes || '']
    );
    return res.rows[0];
  }

  public async deleteTrade(userId: string, tradeId: string): Promise<boolean> {
    if (!this.pool) return false;
    const res = await this.pool.query(
      `DELETE FROM trades WHERE id = $1 AND user_id = $2`,
      [tradeId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Parameterized Asynchronous Postgres Chart Analysis Operations ---
  public async getAnalyses(userId: string): Promise<ChartAnalysis[]> {
    if (!this.pool) return [];
    const res = await this.pool.query(
      `SELECT id, ticker, trend, recommendation, support, resistance, entry,
              stop_loss AS "stopLoss", take_profit1 AS "takeProfit1", take_profit2 AS "takeProfit2",
              take_profit AS "takeProfit", risk_reward_ratio AS "riskRewardRatio", confidence_score AS "confidenceScore",
              reasons, reasoning, bullish_probability AS "bullishProbability", pattern_detected AS "patternDetected",
              indicator_explanation AS "indicatorExplanation", market_sentiment AS "marketSentiment",
              risk_level AS "riskLevel", educational_explanation AS "educationalExplanation",
              ai_model_used AS "aiModelUsed", created_at AS "timestamp"
       FROM analyses WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(row => ({
      ...row,
      reasons: Array.isArray(row.reasons) ? row.reasons : typeof row.reasons === 'string' ? JSON.parse(row.reasons) : []
    }));
  }

  public async addAnalysis(userId: string, analysisData: Omit<ChartAnalysis, 'id' | 'timestamp'>): Promise<ChartAnalysis> {
    if (!this.pool) throw new Error('Database pool not initialized.');
    const id = 'anl_' + crypto.randomBytes(8).toString('hex');
    const reasonsJson = JSON.stringify(analysisData.reasons || []);

    const res = await this.pool.query(
      `INSERT INTO analyses (
        id, user_id, ticker, trend, recommendation, support, resistance,
        entry, stop_loss, take_profit1, take_profit2, take_profit,
        risk_reward_ratio, confidence_score, reasons, reasoning,
        bullish_probability, pattern_detected, indicator_explanation,
        market_sentiment, risk_level, educational_explanation, ai_model_used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
      RETURNING id, ticker, trend, recommendation, support, resistance, entry,
                stop_loss AS "stopLoss", take_profit1 AS "takeProfit1", take_profit2 AS "takeProfit2",
                take_profit AS "takeProfit", risk_reward_ratio AS "riskRewardRatio", confidence_score AS "confidenceScore",
                reasons, reasoning, bullish_probability AS "bullishProbability", pattern_detected AS "patternDetected",
                indicator_explanation AS "indicatorExplanation", market_sentiment AS "marketSentiment",
                risk_level AS "riskLevel", educational_explanation AS "educationalExplanation",
                ai_model_used AS "aiModelUsed", created_at AS "timestamp"`,
      [
        id,
        userId,
        analysisData.ticker || '',
        analysisData.trend || '',
        analysisData.recommendation || '',
        analysisData.support || '',
        analysisData.resistance || '',
        analysisData.entry || '',
        analysisData.stopLoss || '',
        analysisData.takeProfit1 || '',
        analysisData.takeProfit2 || '',
        analysisData.takeProfit || '',
        analysisData.riskRewardRatio || '',
        analysisData.confidenceScore || 0,
        reasonsJson,
        analysisData.reasoning || '',
        analysisData.bullishProbability || 0,
        analysisData.patternDetected || '',
        analysisData.indicatorExplanation || '',
        analysisData.marketSentiment || '',
        analysisData.riskLevel || '',
        analysisData.educationalExplanation || '',
        analysisData.aiModelUsed || ''
      ]
    );

    const row = res.rows[0];
    return {
      ...row,
      reasons: Array.isArray(row.reasons) ? row.reasons : typeof row.reasons === 'string' ? JSON.parse(row.reasons) : []
    };
  }

  // --- Parameterized Asynchronous Postgres Price Alert Operations ---
  public async getAlerts(userId: string): Promise<Alert[]> {
    if (!this.pool) return [];
    const res = await this.pool.query(
      `SELECT id, symbol, condition, value::float, triggered, created_at AS "createdAt"
       FROM alerts WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  public async addAlert(userId: string, alertData: Omit<Alert, 'id' | 'triggered' | 'createdAt'>): Promise<Alert> {
    if (!this.pool) throw new Error('Database pool not initialized.');
    const id = 'alt_' + crypto.randomBytes(8).toString('hex');
    const res = await this.pool.query(
      `INSERT INTO alerts (id, user_id, symbol, condition, value, triggered, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING id, symbol, condition, value::float, triggered, created_at AS "createdAt"`,
      [id, userId, alertData.symbol, alertData.condition, alertData.value]
    );
    return res.rows[0];
  }

  public async triggerAlert(userId: string, alertId: string): Promise<boolean> {
    if (!this.pool) return false;
    const res = await this.pool.query(
      `UPDATE alerts SET triggered = TRUE WHERE id = $1 AND user_id = $2`,
      [alertId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    if (!this.pool) return false;
    const res = await this.pool.query(
      `DELETE FROM alerts WHERE id = $1 AND user_id = $2`,
      [alertId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Efficient SQL Aggregations for SaaS Administrative Metrics ---
  public async getAdminStats() {
    if (!this.pool) {
      return {
        totalUsers: 0,
        plans: { Free: 0, Pro: 0, Enterprise: 0 },
        totalTrades: 0,
        totalAnalyses: 0,
        mrr: 0,
        totalAlerts: 0,
        users: []
      };
    }

    // SQL Aggregation: Plan breakdown
    const planRes = await this.pool.query(
      `SELECT plan, COUNT(*)::int as count FROM users GROUP BY plan`
    );
    const plans: { Free: number; Pro: number; Enterprise: number } = { Free: 0, Pro: 0, Enterprise: 0 };
    let totalUsers = 0;
    planRes.rows.forEach((r: { plan: string; count: number }) => {
      const p = r.plan as 'Free' | 'Pro' | 'Enterprise';
      if (plans[p] !== undefined) {
        plans[p] = r.count;
      }
      totalUsers += r.count;
    });

    // SQL Aggregations: Total counts across child tables
    const tradesCountRes = await this.pool.query(`SELECT COUNT(*)::int as count FROM trades`);
    const analysesCountRes = await this.pool.query(`SELECT COUNT(*)::int as count FROM analyses`);
    const alertsCountRes = await this.pool.query(`SELECT COUNT(*)::int as count FROM alerts`);

    const totalTrades = tradesCountRes.rows[0]?.count || 0;
    const totalAnalyses = analysesCountRes.rows[0]?.count || 0;
    const totalAlerts = alertsCountRes.rows[0]?.count || 0;

    // Calculate MRR
    const mrr = (plans.Pro * 49) + (plans.Enterprise * 199);

    // Get user list
    const usersRes = await this.pool.query(
      `SELECT id, name, email, plan, created_at AS "createdAt" FROM users ORDER BY created_at DESC LIMIT 100`
    );

    return {
      totalUsers,
      plans,
      totalTrades,
      totalAnalyses,
      mrr,
      totalAlerts,
      users: usersRes.rows
    };
  }

  // --- Parameterized User Deletion with Cascade Purging ---
  public async deleteUser(userId: string): Promise<boolean> {
    if (!this.pool) return false;
    const res = await this.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const store = new SaaSStore();
