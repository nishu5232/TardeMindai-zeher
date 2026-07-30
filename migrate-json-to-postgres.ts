import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required to run migration.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to PostgreSQL database...');

    // Read and run schema.sql
    const schemaPath = path.resolve('schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('Schema verification/creation complete.');
    }

    // Check if db.json exists
    const dbJsonPath = path.resolve('db.json');
    if (!fs.existsSync(dbJsonPath)) {
      console.log('No db.json file found. Skipping data migration.');
      await pool.end();
      return;
    }

    const fileContent = fs.readFileSync(dbJsonPath, 'utf8');
    const dbData = JSON.parse(fileContent);

    // Check if users already exist in DB
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM users');
    if (rows[0].count > 0) {
      console.log(`Database already contains ${rows[0].count} users. Migration skipped to prevent duplicate records.`);
      await pool.end();
      return;
    }

    // Migrate users
    const usersMap = dbData.users || {};
    const users = Object.values(usersMap) as any[];
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, password_salt, plan, stripe_subscription_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.name,
          u.email,
          u.passwordHash || '',
          u.passwordSalt || '',
          u.plan || 'Free',
          u.stripeSubscriptionId || '',
          u.createdAt || new Date().toISOString()
        ]
      );
    }

    // Migrate trades
    const tradesMap = dbData.trades || {};
    let totalTrades = 0;
    for (const userId of Object.keys(tradesMap)) {
      const userTrades = tradesMap[userId] || [];
      for (const t of userTrades) {
        await pool.query(
          `INSERT INTO trades (id, user_id, date, symbol, type, entry, exit, size, pnl, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            t.id,
            t.userId || userId,
            t.date || new Date().toISOString().split('T')[0],
            t.symbol,
            t.type,
            t.entry,
            t.exit,
            t.size,
            t.pnl,
            t.notes || '',
            t.createdAt || new Date().toISOString()
          ]
        );
        totalTrades++;
      }
    }
    console.log(`Migrated ${totalTrades} trades.`);

    // Migrate analyses
    const analysesMap = dbData.analyses || {};
    let totalAnalyses = 0;
    for (const userId of Object.keys(analysesMap)) {
      const userAnalyses = analysesMap[userId] || [];
      for (const a of userAnalyses) {
        await pool.query(
          `INSERT INTO analyses (
            id, user_id, ticker, trend, recommendation, support, resistance,
            entry, stop_loss, take_profit1, take_profit2, take_profit,
            risk_reward_ratio, confidence_score, reasons, reasoning,
            bullish_probability, pattern_detected, indicator_explanation,
            market_sentiment, risk_level, educational_explanation, ai_model_used, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (id) DO NOTHING`,
          [
            a.id,
            a.userId || userId,
            a.ticker || '',
            a.trend || '',
            a.recommendation || '',
            a.support || '',
            a.resistance || '',
            a.entry || '',
            a.stopLoss || '',
            a.takeProfit1 || '',
            a.takeProfit2 || '',
            a.takeProfit || '',
            a.riskRewardRatio || '',
            a.confidenceScore || 0,
            JSON.stringify(a.reasons || []),
            a.reasoning || '',
            a.bullishProbability || 0,
            a.patternDetected || '',
            a.indicatorExplanation || '',
            a.marketSentiment || '',
            a.riskLevel || '',
            a.educationalExplanation || '',
            a.aiModelUsed || '',
            a.createdAt || new Date().toISOString()
          ]
        );
        totalAnalyses++;
      }
    }
    console.log(`Migrated ${totalAnalyses} chart analyses.`);

    // Migrate alerts
    const alertsMap = dbData.alerts || {};
    let totalAlerts = 0;
    for (const userId of Object.keys(alertsMap)) {
      const userAlerts = alertsMap[userId] || [];
      for (const alt of userAlerts) {
        await pool.query(
          `INSERT INTO alerts (id, user_id, symbol, condition, value, triggered, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            alt.id,
            alt.userId || userId,
            alt.symbol,
            alt.condition,
            alt.value,
            alt.triggered || false,
            alt.createdAt || new Date().toISOString()
          ]
        );
        totalAlerts++;
      }
    }
    console.log(`Migrated ${totalAlerts} price alerts.`);

    console.log('Migration from db.json to PostgreSQL completed successfully! db.json retained as backup.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
