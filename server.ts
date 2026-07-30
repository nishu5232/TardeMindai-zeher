import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { store } from './server/db';
import { sendVerificationEmail, EmailResult } from './server/email';

// Load environment variables
dotenv.config();

// Production environment variable startup checks
if (process.env.NODE_ENV === 'production') {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('FATAL: RESEND_API_KEY environment variable is missing in production environment');
  }
}

// Initialize Google Gen AI
const geminiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiKey });

async function startServer() {
  const app = express();
  
  // Middleware
  app.use(express.json({ limit: '20mb' })); // Increase limit for chart screenshot uploads
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Request logs helper
  app.use((req, res, next) => {
    console.log(`[SaaS Server] ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
  });

  // Authentication Middleware
  const authenticateToken = async (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: 'Authorization header with token is required' });
    }

    const userId = store.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token is invalid or expired. Please sign in again.' });
    }

    const user = await store.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User associated with this token was not found' });
    }

    req.user = user;
    next();
  };

  // Admin Authorization Middleware
  const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !req.user.email) {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
    }

    const email = req.user.email.toLowerCase();
    const isAdmin = email.endsWith('@trademind.ai') || 
                    email === 'binzadearvind83@gmail.com' || 
                    email.startsWith('admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
    }

    next();
  };

  // Optional Authentication Middleware (for landing page analytics checks)
  const optionalAuthenticate = async (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const userId = store.verifyToken(token);
      if (userId) {
        const user = await store.getUserById(userId);
        if (user) {
          req.user = user;
        }
      }
    }
    next();
  };

  // --- SAAS AUTHENTICATION ENDPOINTS ---

  // Register Endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const existingUser = await store.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email address already exists' });
      }

      const passwordSalt = store.generateSalt();
      const passwordHash = store.hashPassword(password, passwordSalt);
      const user = await store.createUser(name, email, passwordHash, passwordSalt);

      // Dispatch 6-digit verification email
      let emailResult: EmailResult = { success: true };
      if (user.verificationCode) {
        emailResult = await sendVerificationEmail(user.email, user.name, user.verificationCode);
      }

      if (!emailResult.success) {
        return res.status(201).json({
          message: 'Account created, but verification email failed to deliver. Please use "Resend code" on the verification screen to try again.',
          userId: user.id,
          email: user.email,
          requiresVerification: true,
          emailDeliveryFailed: true,
          emailError: emailResult.error
        });
      }

      res.status(201).json({
        message: 'Verification code sent to your email',
        userId: user.id,
        email: user.email,
        requiresVerification: true
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'An error occurred during account creation' });
    }
  });

  // Verify Email Code Endpoint
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { userId, email, code } = req.body;
      const identifier = userId || email;

      if (!identifier || !code) {
        return res.status(400).json({ error: 'User identifier (userId or email) and 6-digit verification code are required' });
      }

      const result = await store.verifyEmailCode(identifier, String(code).trim());
      if (!result.success || !result.user) {
        return res.status(400).json({ error: result.message || 'Email verification failed' });
      }

      const token = store.generateToken(result.user.id);

      res.json({
        message: 'Email address successfully verified',
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          plan: result.user.plan,
          emailVerified: true,
          createdAt: result.user.createdAt
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'An error occurred during email verification' });
    }
  });

  // Resend Verification Code Endpoint
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email, userId } = req.body;
      const identifier = userId || email;

      if (!identifier) {
        return res.status(400).json({ error: 'Email address or user ID is required' });
      }

      const result = await store.regenerateVerificationCode(identifier);
      if (!result.success) {
        const statusCode = result.retryAfter ? 429 : 400;
        return res.status(statusCode).json({ error: result.message, retryAfter: result.retryAfter });
      }

      let emailResult: EmailResult = { success: true };
      if (result.user && result.code) {
        emailResult = await sendVerificationEmail(result.user.email, result.user.name, result.code);
      }

      if (!emailResult.success) {
        return res.status(500).json({
          error: 'Failed to send verification email via Resend API. Please try again in a few moments.',
          emailDeliveryFailed: true,
          emailError: emailResult.error
        });
      }

      res.json({
        message: 'A new 6-digit verification code has been sent to your email address',
        email: result.user?.email,
        userId: result.user?.id
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'An error occurred while resending verification code' });
    }
  });

  // Login Endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await store.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      if (!user.passwordSalt) {
        return res.status(400).json({ error: 'Invalid email or password. Password reset required due to security upgrades.' });
      }

      const hashedInput = store.hashPassword(password, user.passwordSalt);
      if (user.passwordHash !== hashedInput) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      // Block login for unverified accounts
      if (!user.emailVerified) {
        return res.status(403).json({
          error: 'Email not verified',
          requiresVerification: true,
          userId: user.id,
          email: user.email
        });
      }

      const token = store.generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'An error occurred during authentication' });
    }
  });

  // Me Endpoint (Session validation & loading latest tier)
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        plan: req.user.plan,
        createdAt: req.user.createdAt
      }
    });
  });


  // --- SAAS BILLING & SUBSCRIPTION ENDPOINTS ---

  // Simulated Stripe Checkout Session creation
  app.post('/api/subscription/checkout', authenticateToken, async (req: any, res) => {
    try {
      const plan = req.body.plan || req.body.tier;
      if (!plan || !['Free', 'Pro', 'Enterprise'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      // Simulate a premium glassmorphic SaaS billing checkpoint
      const transactionId = 'sub_' + Math.random().toString(36).substring(2, 15);
      
      // Update the user tier on-device
      const updatedUser = await store.updateUserPlan(req.user.id, plan as any, transactionId);

      res.json({
        success: true,
        message: `Successfully updated subscription to ${plan}!`,
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          plan: updatedUser?.plan,
          stripeSubscriptionId: updatedUser?.stripeSubscriptionId
        }
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Failed to complete simulated subscription checkout' });
    }
  });

  // Cancel Subscription
  app.post('/api/subscription/cancel', authenticateToken, async (req: any, res) => {
    try {
      const updatedUser = await store.updateUserPlan(req.user.id, 'Free', '');
      res.json({
        success: true,
        message: 'Subscription cancelled successfully.',
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          plan: updatedUser?.plan
        }
      });
    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });


  // --- QUANTITATIVE TRADE JOURNAL ENDPOINTS ---

  // Get Trades
  app.get('/api/journal', authenticateToken, async (req: any, res) => {
    try {
      const trades = await store.getTrades(req.user.id);
      res.json({ trades });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve trade journal records' });
    }
  });

  // Add Trade
  app.post('/api/journal', authenticateToken, async (req: any, res) => {
    try {
      const { date, symbol, type, entry, exit, size, notes } = req.body;
      if (!date || !symbol || !type || !entry || !exit || !size) {
        return res.status(400).json({ error: 'Missing required trade details' });
      }

      // Convert variables safely and calculate PnL on-server to maintain arithmetic security
      const parsedEntry = parseFloat(entry);
      const parsedExit = parseFloat(exit);
      const parsedSize = parseFloat(size);

      if (isNaN(parsedEntry) || isNaN(parsedExit) || isNaN(parsedSize)) {
        return res.status(400).json({ error: 'Entry, exit, and size must be numbers' });
      }

      // Buy PnL = (exit - entry) * size
      // Sell PnL = (entry - exit) * size
      const multiplier = type === 'Buy' ? 1 : -1;
      const pnl = parseFloat(((parsedExit - parsedEntry) * parsedSize * multiplier).toFixed(2));

      const newTrade = await store.addTrade(req.user.id, {
        date,
        symbol: symbol.toUpperCase(),
        type: type as 'Buy' | 'Sell',
        entry: parsedEntry,
        exit: parsedExit,
        size: parsedSize,
        pnl,
        notes: notes || ''
      });

      res.status(201).json({ success: true, trade: newTrade });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add trade journal record' });
    }
  });

  // Delete Trade
  app.delete('/api/journal/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await store.deleteTrade(req.user.id, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Trade record not found' });
      }
      res.json({ success: true, message: 'Trade record removed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete trade record' });
    }
  });


  // --- SAAS SAAS ANALYTICS ENDPOINT ---

  // Calculates real portfolio metrics from server-side user data
  app.get('/api/analytics', authenticateToken, async (req: any, res) => {
    try {
      const trades = await store.getTrades(req.user.id);
      
      if (trades.length === 0) {
        return res.json({
          totalTrades: 0,
          winRate: 0,
          totalPnL: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          equityCurve: []
        });
      }

      const wins = trades.filter(t => t.pnl > 0);
      const losses = trades.filter(t => t.pnl <= 0);

      const totalPnL = parseFloat(trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2));
      const winRate = parseFloat(((wins.length / trades.length) * 100).toFixed(1));

      const avgWin = wins.length > 0 ? parseFloat((wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length).toFixed(2)) : 0;
      const avgLoss = losses.length > 0 ? parseFloat((losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length).toFixed(2)) : 0;

      const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

      // Calculate sequential equity curve over time
      let runningPnL = 0;
      const equityCurve = [...trades]
        .reverse() // Oldest first to build cumulative curve
        .map((t, index) => {
          runningPnL = parseFloat((runningPnL + t.pnl).toFixed(2));
          return {
            tradeNumber: index + 1,
            date: t.date,
            symbol: t.symbol,
            pnl: t.pnl,
            equity: runningPnL
          };
        });

      res.json({
        totalTrades: trades.length,
        winRate,
        totalPnL,
        avgWin,
        avgLoss,
        profitFactor,
        equityCurve
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to compile journal portfolio analytics' });
    }
  });


  // --- REAL-TIME ALERTS ENDPOINTS ---

  // Get Alerts
  app.get('/api/alerts', authenticateToken, async (req: any, res) => {
    try {
      const alerts = await store.getAlerts(req.user.id);
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve active alerts' });
    }
  });

  // Create Alert
  app.post('/api/alerts', authenticateToken, async (req: any, res) => {
    try {
      const { symbol, condition, value } = req.body;
      if (!symbol || !condition || !value) {
        return res.status(400).json({ error: 'Symbol, condition, and value are required' });
      }

      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return res.status(400).json({ error: 'Alert target value must be a valid number' });
      }

      const newAlert = await store.addAlert(req.user.id, {
        symbol: symbol.toUpperCase(),
        condition: condition as 'above' | 'below',
        value: parsedValue
      });

      res.status(201).json({ success: true, alert: newAlert });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record custom alert' });
    }
  });

  // Trigger Alert
  app.post('/api/alerts/:id/trigger', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const triggered = await store.triggerAlert(req.user.id, id);
      if (!triggered) {
        return res.status(404).json({ error: 'Alert not found or already triggered' });
      }
      res.json({ success: true, message: 'Alert triggered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update alert state' });
    }
  });

  // Delete Alert
  app.delete('/api/alerts/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await store.deleteAlert(req.user.id, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Alert record not found' });
      }
      res.json({ success: true, message: 'Alert removed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete alert record' });
    }
  });


  // --- SAAS ADMINISTRATIVE METRICS ENDPOINTS ---

  // Get Admin Stats
  app.get('/api/admin/metrics', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const stats = await store.getAdminStats();
      res.json({ 
        stats,
        accessGranted: true,
        isAdminUser: true
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to compile administrator system metrics' });
    }
  });

  // Admin delete/suspend user
  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Administrators cannot delete their own profile' });
      }

      const deleted = await store.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ success: true, message: 'User account and synchronized records successfully purged' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete specified user' });
    }
  });


  // --- AI AND SAAS CORE API SERVICES ---

  // Status check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      hasApiKey: !!process.env.GEMINI_API_KEY
    });
  });

  // Payment Webhook Handlers
  app.post('/api/webhooks/stripe', async (req: any, res: express.Response) => {
    try {
      const event = req.body;
      console.log('[Stripe Webhook Received]', event?.type);
      if (event?.type === 'checkout.session.completed' || event?.type === 'customer.subscription.updated') {
        const email = event.data?.object?.customer_email || event.data?.object?.email;
        const plan = event.data?.object?.metadata?.plan || 'Pro';
        if (email) {
          const user = await store.getUserByEmail(email);
          if (user) {
            await store.updateUserPlan(user.id, plan);
            console.log(`Updated user ${email} to plan ${plan} via Stripe Webhook`);
          }
        }
      }
      res.json({ received: true });
    } catch (err) {
      console.error('Stripe webhook error:', err);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  });

  app.post('/api/webhooks/razorpay', async (req: any, res: express.Response) => {
    try {
      const event = req.body;
      console.log('[Razorpay Webhook Received]', event?.event);
      if (event?.event === 'payment.captured' || event?.event === 'subscription.charged') {
        const email = event.payload?.payment?.entity?.email;
        const notesPlan = event.payload?.payment?.entity?.notes?.plan || 'Pro';
        if (email) {
          const user = await store.getUserByEmail(email);
          if (user) {
            await store.updateUserPlan(user.id, notesPlan);
            console.log(`Updated user ${email} to plan ${notesPlan} via Razorpay Webhook`);
          }
        }
      }
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('Razorpay webhook error:', err);
      res.status(400).json({ error: 'Razorpay webhook processing error' });
    }
  });

  // AI Chart Analysis Endpoint
  app.post('/api/analyze-chart', optionalAuthenticate, async (req: any, res: express.Response) => {
    try {
      const { image, mimeType, additionalContext, marketType, aiModel } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      if (!geminiKey) {
        return res.status(400).json({ 
          error: 'GEMINI_API_KEY is missing. Please configure it in your Secrets / Environment Variables.' 
        });
      }

      // Check tier limit: Free users have limited API access or scan allowance
      const user = req.user;
      if (user) {
        const analyses = await store.getAnalyses(user.id);
        if (user.plan === 'Free' && analyses.length >= 3) {
          return res.status(403).json({ 
            error: 'Free Tier account scan limit reached. Please upgrade to Pro or Enterprise for unlimited high-performance visual scans!' 
          });
        }
      }

      const activeMarket = marketType || 'Forex';
      const selectedModelName = aiModel || 'Gemini 3.6 Flash';

      // Prepare the contents array
      const prompt = `You are an elite quantitative multi-model AI system operating in [${selectedModelName}] mode. Analyze this trading chart screenshot, focusing exclusively on the ${activeMarket} market. 
      This AI Visual Analyzer is restricted strictly to Forex and Crypto market segments only.
      
      Additional context provided by user: "${additionalContext || 'None'}"
      
      Respond STRICTLY in JSON format with the following structure, and NO markdown wrapping (no \`\`\`json block, just the raw JSON object string):
      {
        "ticker": "Detected pair or symbol (e.g. BTCUSD, EURUSD, XAUUSD, ETHUSD, GBPUSD)",
        "trend": "Bullish" | "Bearish" | "Neutral" | "Consolidating",
        "recommendation": "BUY" | "SELL" | "HOLD",
        "support": "Key support level (e.g. 1.08200 or $61,200)",
        "resistance": "Key resistance level (e.g. 1.09600 or $64,500)",
        "entry": "Exact Entry Price (e.g. 1.08650 or $62,100)",
        "stopLoss": "Exact Stop Loss Price (e.g. 1.08100 or $60,800)",
        "takeProfit1": "Take Profit Target 1 (e.g. 1.09100 or $63,800)",
        "takeProfit2": "Take Profit Target 2 (e.g. 1.09800 or $65,400)",
        "riskRewardRatio": "e.g. 1 : 2.8",
        "confidenceScore": number (0 to 100),
        "reasons": [
          "Short bullet point reason 1 (e.g. Bullish trend)",
          "Short bullet point reason 2 (e.g. RSI recovering from oversold zone)",
          "Short bullet point reason 3 (e.g. MACD bullish divergence crossover)",
          "Short bullet point reason 4 (e.g. Strong demand block support zone)"
        ],
        "reasoning": "A paragraph explaining the overall technical structure and market context.",
        "bullishProbability": number (0 to 100),
        "patternDetected": "Any visual pattern detected (e.g. Double Bottom, Bull Flag, Head and Shoulders, Breakout)",
        "indicatorExplanation": "Breakdown of visible indicators (Moving Averages, RSI, MACD, Volume)",
        "marketSentiment": "e.g. Greed, Fear, Extreme Greed, Neutral",
        "riskLevel": "Low" | "Moderate" | "High",
        "educationalExplanation": "An educational tip about how to execute this trade setup safely."
      }`;

      // Call the Gemini model
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            inlineData: {
              data: image.split(',')[1] || image, // strip base64 header if present
              mimeType: mimeType || 'image/png'
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      
      // Attempt to clean output in case model wrapped it in markdown code blocks
      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.substring(7);
      }
      if (cleanedJson.endsWith('```')) {
        cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
      }
      cleanedJson = cleanedJson.trim();

      const parsedAnalysis = JSON.parse(cleanedJson);
      parsedAnalysis.aiModelUsed = selectedModelName;

      // Save analysis history on-disk for authenticated users
      if (user) {
        await store.addAnalysis(user.id, parsedAnalysis);
      }

      res.json(parsedAnalysis);
    } catch (error) {
      console.error('Gemini chart analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze chart: ' + (error as Error).message });
    }
  });

  // AI Chat Endpoint
  app.post('/api/chat', optionalAuthenticate, async (req: any, res: express.Response) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      if (!geminiKey) {
        return res.status(400).json({ 
          error: 'GEMINI_API_KEY is missing. Please configure it in your Secrets / Environment Variables.' 
        });
      }

      // Check User System Plan
      const user = req.user;
      const userPlan = user ? user.plan : 'Free';

      // Map roles for Gemini standard generateContent SDK
      const contents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are Trademind AI, a world-class financial analyst and AI trading companion. Assist the user with chart patterns, technical indicators, trading strategies, risk management, market psychology, and educational lessons. Keep responses highly professional, clean, and styled with Markdown (use tables, bullet points, code blocks, or bold text where helpful). Highlight key numbers and price targets.
      
      User tier: ${userPlan}. 
      ${userPlan === 'Free' ? 'Gently advise the user on their Free limitations, encouraging them to scale to the Pro or Enterprise workspaces.' : 'Provide deeply exhaustive quantitative reasoning suited for our premium ' + userPlan + ' user.'}
      
      Disclaimer: You provide analytics and educational insights, not licensed financial advice. Always encourage risk management and stop-loss practice.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction
        }
      });

      res.json({ text: response.text || 'I was unable to formulate a response. Please try again.' });
    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ error: 'Failed to generate chat response: ' + (error as Error).message });
    }
  });

  // Serve Frontend
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from dist/ folder
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    // In development mode, use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
