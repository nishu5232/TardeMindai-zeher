import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  stripeSubscriptionId?: string;
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
  riskRewardRatio: string;
  confidenceScore: number;
  reasoning: string;
  bullishProbability: number;
  patternDetected: string;
  indicatorExplanation: string;
  marketSentiment: string;
  riskLevel: string;
  educationalExplanation: string;
  timestamp: string;
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

interface DatabaseSchema {
  users: Record<string, User>;
  trades: Record<string, Trade[]>; // Keyed by userId
  analyses: Record<string, ChartAnalysis[]>; // Keyed by userId
  alerts?: Record<string, Alert[]>; // Keyed by userId
}

const DB_PATH = path.resolve('db.json');

// Initial seed or empty DB
const initialDb: DatabaseSchema = {
  users: {},
  trades: {},
  analyses: {},
  alerts: {}
};

class SaaSStore {
  private db: DatabaseSchema = { ...initialDb };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        this.db = JSON.parse(data);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to load database. Initializing empty storage:', err);
      this.db = { ...initialDb };
    }
  }

  private save() {
    try {
      // Atomic write pattern
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.db, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('Failed to save database state:', err);
    }
  }

  // Cryptographic hashing using PBKDF2/scrypt for security
  public hashPassword(password: string): string {
    const salt = 'trademind_secure_salt_array';
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  public generateToken(userId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', 'trademind_jwt_secret_key_2026').update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  public verifyToken(token: string): string | null {
    try {
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) return null;

      const expectedSignature = crypto.createHmac('sha256', 'trademind_jwt_secret_key_2026').update(`${header}.${payload}`).digest('base64url');
      if (signature !== expectedSignature) return null;

      const decryptedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decryptedPayload.exp < Date.now()) return null; // Token expired

      return decryptedPayload.userId;
    } catch {
      return null;
    }
  }

  // User Operations
  public getUserByEmail(email: string): User | null {
    const user = Object.values(this.db.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  public getUserById(id: string): User | null {
    return this.db.users[id] || null;
  }

  public createUser(name: string, email: string, passwordHash: string): User {
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const newUser: User = {
      id,
      name,
      email,
      passwordHash,
      plan: 'Free',
      createdAt: new Date().toISOString()
    };
    this.db.users[id] = newUser;
    this.save();
    return newUser;
  }

  public updateUserPlan(userId: string, plan: 'Free' | 'Pro' | 'Enterprise', stripeSubscriptionId?: string): User | null {
    const user = this.db.users[userId];
    if (!user) return null;

    user.plan = plan;
    if (stripeSubscriptionId) {
      user.stripeSubscriptionId = stripeSubscriptionId;
    }
    this.db.users[userId] = user;
    this.save();
    return user;
  }

  // Trade Operations
  public getTrades(userId: string): Trade[] {
    return this.db.trades[userId] || [];
  }

  public addTrade(userId: string, tradeData: Omit<Trade, 'id'>): Trade {
    const id = 'trd_' + crypto.randomBytes(8).toString('hex');
    const newTrade: Trade = {
      id,
      ...tradeData
    };

    if (!this.db.trades[userId]) {
      this.db.trades[userId] = [];
    }
    this.db.trades[userId].unshift(newTrade); // Newest first
    this.save();
    return newTrade;
  }

  public deleteTrade(userId: string, tradeId: string): boolean {
    const userTrades = this.db.trades[userId];
    if (!userTrades) return false;

    const initialLength = userTrades.length;
    this.db.trades[userId] = userTrades.filter(t => t.id !== tradeId);
    
    if (this.db.trades[userId].length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Chart Analysis Operations
  public getAnalyses(userId: string): ChartAnalysis[] {
    return this.db.analyses[userId] || [];
  }

  public addAnalysis(userId: string, analysisData: Omit<ChartAnalysis, 'id' | 'timestamp'>): ChartAnalysis {
    const id = 'anl_' + crypto.randomBytes(8).toString('hex');
    const newAnalysis: ChartAnalysis = {
      id,
      ...analysisData,
      timestamp: new Date().toISOString()
    };

    if (!this.db.analyses[userId]) {
      this.db.analyses[userId] = [];
    }
    this.db.analyses[userId].unshift(newAnalysis); // Newest first
    this.save();
    return newAnalysis;
  }

  // Alert Operations
  public getAlerts(userId: string): Alert[] {
    if (!this.db.alerts) {
      this.db.alerts = {};
    }
    return this.db.alerts[userId] || [];
  }

  public addAlert(userId: string, alertData: Omit<Alert, 'id' | 'triggered' | 'createdAt'>): Alert {
    const id = 'alt_' + crypto.randomBytes(8).toString('hex');
    const newAlert: Alert = {
      id,
      ...alertData,
      triggered: false,
      createdAt: new Date().toISOString()
    };

    if (!this.db.alerts) {
      this.db.alerts = {};
    }
    if (!this.db.alerts[userId]) {
      this.db.alerts[userId] = [];
    }
    this.db.alerts[userId].unshift(newAlert);
    this.save();
    return newAlert;
  }

  public triggerAlert(userId: string, alertId: string): boolean {
    if (!this.db.alerts || !this.db.alerts[userId]) return false;

    const alert = this.db.alerts[userId].find(a => a.id === alertId);
    if (!alert) return false;

    alert.triggered = true;
    alert.triggeredAt = new Date().toISOString();
    this.save();
    return true;
  }

  public deleteAlert(userId: string, alertId: string): boolean {
    if (!this.db.alerts || !this.db.alerts[userId]) return false;

    const userAlerts = this.db.alerts[userId];
    const initialLength = userAlerts.length;
    this.db.alerts[userId] = userAlerts.filter(a => a.id !== alertId);
    
    if (this.db.alerts[userId].length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Admin Operations
  public getAdminStats() {
    const allUsers = Object.values(this.db.users);
    const totalUsers = allUsers.length;
    
    const plans = { Free: 0, Pro: 0, Enterprise: 0 };
    allUsers.forEach(u => {
      if (plans[u.plan] !== undefined) {
        plans[u.plan]++;
      }
    });

    let totalTrades = 0;
    Object.values(this.db.trades).forEach(list => {
      totalTrades += list.length;
    });

    let totalAnalyses = 0;
    Object.values(this.db.analyses).forEach(list => {
      totalAnalyses += list.length;
    });

    let totalAlerts = 0;
    if (this.db.alerts) {
      Object.values(this.db.alerts).forEach(list => {
        totalAlerts += list.length;
      });
    }

    // Simulated SaaS revenue
    const mrr = (plans.Pro * 49) + (plans.Enterprise * 199);

    return {
      totalUsers,
      plans,
      totalTrades,
      totalAnalyses,
      mrr,
      totalAlerts,
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        createdAt: u.createdAt
      }))
    };
  }

  public deleteUser(userId: string): boolean {
    if (!this.db.users[userId]) return false;
    delete this.db.users[userId];
    delete this.db.trades[userId];
    delete this.db.analyses[userId];
    if (this.db.alerts) {
      delete this.db.alerts[userId];
    }
    this.save();
    return true;
  }
}

export const store = new SaaSStore();
