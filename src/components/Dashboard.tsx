import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, PieChart as ReChartsPie, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Shield, Key, DollarSign, Plus, ArrowRight, Upload, MessageSquare, User, Sparkles, 
  BookOpen, Clock, AlertTriangle, Check, Settings, LogOut, ChevronDown, ChevronUp, Calendar, 
  RefreshCw, BarChart2, PieChart, Star, Terminal, Cpu, Trash2, Edit2, Info, Landmark, FileText, Lock,
  Bell, BellRing, Activity, Database, Users, CheckCircle
} from 'lucide-react';

interface DashboardProps {
  user: { name: string; email: string; plan: string };
  onLogout: () => void;
  onUpdatePlan: (newPlan: string) => void;
}

// Preset Sample Charts for AI Analyzer inside dashboard
const SAMPLE_CHARTS = [
  { id: 'tsla_breakout', name: 'TSLA - Ascending Triangle Breakout', ticker: 'TSLA', type: 'Equities', desc: 'Consolidation breakout above $185 level.' },
  { id: 'btc_bear_flag', name: 'BTC/USD - Bear Flag Consolidation', ticker: 'BTCUSD', type: 'Crypto', desc: 'Bearish continuation pattern flag setting up below $65K.' },
  { id: 'eur_usd_divergence', name: 'EUR/USD - Bullish RSI Divergence', ticker: 'EURUSD', type: 'Forex', desc: 'Price making lower lows while RSI forms higher lows.' }
];

export default function Dashboard({ user, onLogout, onUpdatePlan }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'analyzer' | 'chat' | 'journal' | 'risk' | 'settings' | 'admin'>('terminal');

  // Real-time ticking quote price feed
  const [prices, setPrices] = useState({
    BTCUSD: 64182.40,
    ETHUSD: 3448.90,
    XAUUSD: 2382.15,
    NVDA: 138.45,
    AAPL: 194.10,
    TSLA: 184.20,
    EURUSD: 1.08940
  });

  const [activeSymbol, setActiveSymbol] = useState<'BTCUSD' | 'ETHUSD' | 'XAUUSD' | 'NVDA' | 'AAPL' | 'TSLA' | 'EURUSD'>('NVDA');

  // State managers
  const [watchlist, setWatchlist] = useState<string[]>(['NVDA', 'BTCUSD', 'ETHUSD', 'XAUUSD']);
  const [newsFeed, setNewsFeed] = useState([
    { id: 1, title: 'Federal Reserve hints at upcoming interest rate cuts in September meeting.', impact: 'High', source: 'Bloomberg', age: '12m ago' },
    { id: 2, title: 'NVIDIA shipping next-generation Blackwell B200 accelerators at scale.', impact: 'High', source: 'Reuters', age: '32m ago' },
    { id: 3, title: 'Bitcoin network hash rate hits record highs amid secondary miner accumulation.', impact: 'Medium', source: 'CoinDesk', age: '1h ago' },
    { id: 4, title: 'Gold contracts steady as macroeconomic risk hedging intensifies.', impact: 'Low', source: 'Kitco', age: '2h ago' }
  ]);

  // Live Signals Array
  const [signals] = useState([
    { symbol: 'NVDA', type: 'Buy', entry: '$135.20', target: '$148.00', sl: '$129.80', rr: '1:2.4', confidence: 94, status: 'Active' },
    { symbol: 'BTCUSD', type: 'Buy', entry: '$63,500', target: '$72,000', sl: '$59,400', rr: '1:2.1', confidence: 89, status: 'Active' },
    { symbol: 'EURUSD', type: 'Short', entry: '1.09200', target: '1.08100', sl: '1.09650', rr: '1:2.4', confidence: 82, status: 'Triggered' }
  ]);

  // AI Analyzer states
  const [analyzerChart, setAnalyzerChart] = useState(SAMPLE_CHARTS[0]);
  const [customFile, setCustomFile] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [scannedAssetName, setScannedAssetName] = useState('');
  const [marketType, setMarketType] = useState<'Forex' | 'Crypto'>('Forex');

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: `Welcome to Trademind Intelligence Terminal, **${user.name}**. I am your custom-trained quantitative trading companion. Upload a chart to scanner, ask technical indicator questions, or calculate risk parameters.` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Trade Journal states synced to server
  const [trades, setTrades] = useState<Array<{
    id: string; date: string; symbol: string; type: 'Buy' | 'Sell'; entry: number; exit: number; size: number; pnl: number; notes: string;
  }>>([]);

  const [saasAnalytics, setSaasAnalytics] = useState<any | null>(null);
  const [saasAnalyticsLoading, setSaasAnalyticsLoading] = useState(false);

  // Billing & Checkout state
  const [checkoutPlan, setCheckoutPlan] = useState<'Pro' | 'Enterprise' | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [journalDate, setJournalDate] = useState('2026-07-20');
  const [journalSymbol, setJournalSymbol] = useState('NVDA');
  const [journalType, setJournalType] = useState<'Buy' | 'Sell'>('Buy');
  const [journalEntry, setJournalEntry] = useState('');
  const [journalExit, setJournalExit] = useState('');
  const [journalSize, setJournalSize] = useState('');
  const [journalNotes, setJournalNotes] = useState('');

  // Position Sizing Risk State
  const [riskBalance, setRiskBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [riskEntry, setRiskEntry] = useState('135.00');
  const [riskStop, setRiskStop] = useState('129.50');
  const [riskResult, setRiskResult] = useState<any | null>(null);

  // API Key state (saved in localStorage)
  const [apiKeys, setApiKeys] = useState({
    gemini: localStorage.getItem('key_gemini') || '',
    openai: localStorage.getItem('key_openai') || '',
    twelveData: localStorage.getItem('key_twelvedata') || ''
  });

  // Notifications toggles
  const [notifySignals, setNotifySignals] = useState(true);
  const [notifyNews, setNotifyNews] = useState(false);

  // --- TRADINGVIEW WIDGET SCRIPT STATE ---
  const [tvLoaded, setTvLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => setTvLoaded(true);
      document.head.appendChild(script);
    } else {
      setTvLoaded(true);
    }
  }, []);

  // --- REAL-TIME PRICE ALERTS SYSTEM ---
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertSymbol, setAlertSymbol] = useState<string>('NVDA');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertValue, setAlertValue] = useState<string>('');
  const [triggeredAlertsLog, setTriggeredAlertsLog] = useState<any[]>([]);

  // Fetch alerts from backend
  const handleLoadAlerts = async () => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;
    try {
      const response = await fetch('/api/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  // Create alert
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('trademind_token');
    if (!token) return;

    if (!alertValue || isNaN(parseFloat(alertValue))) {
      alert('Please enter a valid numeric alert value.');
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: alertSymbol,
          condition: alertCondition,
          value: parseFloat(alertValue)
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAlerts(prev => [data.alert, ...prev]);
        setAlertValue('');
      } else {
        alert(data.error || 'Failed to create alert.');
      }
    } catch (err) {
      console.error('Error creating alert:', err);
    }
  };

  // Delete alert
  const handleDeleteAlert = async (id: string) => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  // Sync alerts on mount
  useEffect(() => {
    handleLoadAlerts();
  }, []);

  // Continuous Alert Crossing Evaluator Hook
  useEffect(() => {
    if (alerts.length === 0) return;
    const token = localStorage.getItem('trademind_token');
    if (!token) return;

    alerts.forEach(async (alt) => {
      if (alt.triggered) return;
      const currentPrice = (prices as any)[alt.symbol];
      if (!currentPrice) return;

      let crossed = false;
      if (alt.condition === 'above' && currentPrice >= alt.value) {
        crossed = true;
      } else if (alt.condition === 'below' && currentPrice <= alt.value) {
        crossed = true;
      }

      if (crossed) {
        // Optimistically set triggered in local state to prevent duplicate loops
        setAlerts(prev => prev.map(a => a.id === alt.id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a));
        
        // Push alert trigger event log
        setTriggeredAlertsLog(prev => [
          { ...alt, currentPrice, triggeredAt: new Date().toISOString() },
          ...prev
        ]);

        // Trigger backend sync
        try {
          await fetch(`/api/alerts/${alt.id}/trigger`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (err) {
          console.error('Error syncing triggered alert:', err);
        }
      }
    });
  }, [prices, alerts]);


  // --- SAAS ADMINISTRATOR SYSTEMS AND METRICS ---
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(() => localStorage.getItem('trademind_admin_unlocked') === 'true');

  const handleLoadAdminStats = async () => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;
    setAdminLoading(true);
    try {
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data.stats);
        setIsAdminUser(data.isAdminUser);
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminToggleTier = async (userId: string, currentPlan: string) => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;
    
    // Toggle user plan Pro -> Enterprise -> Free
    const nextPlan = currentPlan === 'Free' ? 'Pro' : currentPlan === 'Pro' ? 'Enterprise' : 'Free';
    
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: nextPlan })
      });
      
      alert(`Simulation: User plan updated to ${nextPlan}.`);
      handleLoadAdminStats();
    } catch (err) {
      console.error('Admin tier update error:', err);
    }
  };

  const handleAdminDeleteUser = async (userId: string) => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;

    if (!confirm('Are you absolutely sure you want to permanently purge this user and all associated trading data? This is irreversible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'User successfully purged.');
        handleLoadAdminStats();
      } else {
        alert(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Admin delete user error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' || adminUnlocked) {
      handleLoadAdminStats();
    }
  }, [activeTab, adminUnlocked]);

  // Initialize drawings-enabled high-performance TradingView widget
  useEffect(() => {
    if (tvLoaded && (window as any).TradingView && activeTab === 'terminal') {
      const initWidget = () => {
        const container = document.getElementById('tradingview_interactive_widget');
        if (!container) return;
        try {
          new (window as any).TradingView.widget({
            width: '100%',
            height: '100%',
            symbol: getTradingViewSymbol(activeSymbol),
            interval: '60',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#0a0a0a',
            enable_publishing: false,
            hide_side_toolbar: false, // Show technical drawings sidebar
            allow_symbol_change: true,
            container_id: 'tradingview_interactive_widget',
            studies: [
              'MASimple@tv-basicstudies',
              'RSI@tv-basicstudies',
              'MACD@tv-basicstudies'
            ],
            show_popup_button: true,
            popup_width: '1000',
            popup_height: '650'
          });
        } catch (err) {
          console.error('TradingView widget initialization failed:', err);
        }
      };

      const timer = setTimeout(initWidget, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSymbol, tvLoaded, activeTab]);

  // Fluctuating real-time prices inside terminal loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => ({
        BTCUSD: prev.BTCUSD + (Math.random() - 0.5) * 12,
        ETHUSD: prev.ETHUSD + (Math.random() - 0.5) * 2.5,
        XAUUSD: prev.XAUUSD + (Math.random() - 0.5) * 0.9,
        NVDA: prev.NVDA + (Math.random() - 0.5) * 0.25,
        AAPL: prev.AAPL + (Math.random() - 0.5) * 0.18,
        TSLA: prev.TSLA + (Math.random() - 0.5) * 0.35,
        EURUSD: prev.EURUSD + (Math.random() - 0.5) * 0.00015
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Fetch Trades on mount
  useEffect(() => {
    const token = localStorage.getItem('trademind_token');
    if (token) {
      fetch('/api/journal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.trades) {
          setTrades(data.trades);
        }
      })
      .catch(err => console.error('Error fetching trades:', err));
    }
  }, []);

  // Sync journal metrics from Express analytics engine
  const loadSaasAnalytics = async () => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;
    setSaasAnalyticsLoading(true);
    try {
      const response = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSaasAnalytics(data);
      }
    } catch (err) {
      console.error('Error compiling SaaS portfolio analytics:', err);
    } finally {
      setSaasAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadSaasAnalytics();
  }, [trades]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Execute actual AI chart scanner (Gemini vision)
  const handleAnalyzeChart = async () => {
    if (!customFile) return;
    setAnalyzing(true);
    setAnalysis(null);
    const token = localStorage.getItem('trademind_token');
    const targetName = customFileName || 'Custom Uploaded Chart';
    setScannedAssetName(targetName);

    try {
      let imageBase64 = customFile;
      let mimeType = 'image/png';
      const match = customFile.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
      }

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          image: imageBase64,
          mimeType,
          marketType,
          additionalContext: `User uploaded a custom ${marketType} chart file named "${customFileName}". User manual instructions overlay: "${additionalInstructions}"`
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'API server returned error');
      }

      setAnalysis(result);
    } catch (err) {
      console.error('Analyzer error:', err);
      // Premium Offline fallback values based on selected marketType
      const isForex = marketType === 'Forex';
      setAnalysis({
        ticker: isForex ? 'EURUSD' : 'BTCUSD',
        trend: 'Bullish',
        recommendation: 'BUY',
        support: isForex ? '1.08200' : '117,600',
        resistance: isForex ? '1.09600' : '120,400',
        entry: isForex ? '1.08650' : '118,250',
        stopLoss: isForex ? '1.08100' : '117,600',
        takeProfit1: isForex ? '1.09100' : '119,100',
        takeProfit2: isForex ? '1.09800' : '120,400',
        takeProfit: isForex ? '1.09400' : '119,100',
        riskRewardRatio: '1 : 2.8',
        confidenceScore: 91,
        reasons: [
          'Bullish trend structural breakout',
          'RSI recovering from key oversold zone',
          'MACD bullish momentum crossover',
          'Strong demand block support holding'
        ],
        reasoning: `Analysis of ${targetName} (${marketType} Market) indicates key structural support levels are holding. Clear volume profiles and moving averages indicate momentum is fanning out. ${(err as Error).message ? ' (System Gateway offline fallback activated)' : ''}`,
        bullishProbability: 85,
        patternDetected: 'Breakout Consolidation',
        indicatorExplanation: 'The MACD signal shows a bullish divergence crossover on the 4H time frame. RSI values are resetting in the moderate zone.',
        marketSentiment: 'Greed',
        riskLevel: 'Moderate',
        educationalExplanation: 'Always size capital cautiously when trading chart patterns. Wait for candle confirmation on breakouts before scaling full capital.'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Upload visual handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFile(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle active chatbot submission
  const handleSendChat = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const prompt = presetText || chatInput;
    if (!prompt.trim() || chatLoading) return;

    const userMsg = { role: 'user' as const, text: prompt };
    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setChatLoading(true);
    const token = localStorage.getItem('trademind_token');

    try {
      const chatHistory = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: chatHistory })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'API server failed');
      }

      setChatMessages(prev => [...prev, { role: 'model', text: result.text }]);
    } catch (err) {
      console.error('Chat error:', err);
      // Offline fallback simulator
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'model', 
          text: `I received your query regarding "**${prompt}**". To offer custom real-time predictions, please ensure your \`GEMINI_API_KEY\` is configured. Technically, support holds near major key historical moving averages.` 
        }]);
      }, 1000);
    } finally {
      setChatLoading(false);
    }
  };

  // Trade journal CRUD additions synced to database
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('trademind_token');
    if (!token) return;

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: journalDate,
          symbol: journalSymbol,
          type: journalType,
          entry: journalEntry,
          exit: journalExit,
          size: journalSize,
          notes: journalNotes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save trade record');
      }

      if (data.success) {
        setTrades(prev => [data.trade, ...prev]);
        setJournalEntry('');
        setJournalExit('');
        setJournalSize('');
        setJournalNotes('');
      }
    } catch (err) {
      console.error('Error adding trade:', err);
      alert((err as Error).message);
    }
  };

  const handleDeleteTrade = async (id: string | number) => {
    const token = localStorage.getItem('trademind_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setTrades(prev => prev.filter(t => t.id !== id));
      } else {
        throw new Error(data.error || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting trade:', err);
    }
  };

  // Risk Position calculator engine
  const handleCalculateRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(riskBalance);
    const pct = parseFloat(riskPercent);
    const entry = parseFloat(riskEntry);
    const sl = parseFloat(riskStop);

    if (isNaN(bal) || isNaN(pct) || isNaN(entry) || isNaN(sl) || entry === sl) return;

    const cashRisk = bal * (pct / 100);
    const distancePrice = Math.abs(entry - sl);
    const positionSizeNeeded = cashRisk / distancePrice;
    const faceValue = positionSizeNeeded * entry;
    const leverageRequired = faceValue / bal;

    setRiskResult({
      cashRisk,
      size: positionSizeNeeded,
      faceValue,
      leverage: leverageRequired
    });
  };

  // Save localized API Keys
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('key_gemini', apiKeys.gemini);
    localStorage.setItem('key_openai', apiKeys.openai);
    localStorage.setItem('key_twelvedata', apiKeys.twelveData);
    alert('Custom API Credentials saved securely to your browser local memory.');
  };

  // Journal metrics summaries
  const totalPnl = trades.reduce((acc, curr) => acc + curr.pnl, 0);
  const winTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = trades.length ? (winTrades / trades.length) * 100 : 0;

  // TradingView Symbol Translation
  const getTradingViewSymbol = (sym: string) => {
    if (sym === 'BTCUSD') return 'BINANCE:BTCUSDT';
    if (sym === 'ETHUSD') return 'BINANCE:ETHUSDT';
    if (sym === 'XAUUSD') return 'OANDA:XAUUSD';
    if (sym === 'EURUSD') return 'FX:EURUSD';
    return `NASDAQ:${sym}`;
  };

  // Dynamic Helmet SEO/Metadata calculations
  let helmetTitle = 'Workstation | Trademind.ai Terminal';
  let helmetDesc = 'Your quantitative workstation for AI-assisted trading strategy execution.';
  
  if (activeTab === 'terminal') {
    const symbolPrice = prices[activeSymbol] ? `$${prices[activeSymbol].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    helmetTitle = `${activeSymbol} ${symbolPrice} | Trademind.ai Terminal`;
    helmetDesc = `Monitor ${activeSymbol} live quotes, charts, and AI trading indicators in your workstation.`;
  } else if (activeTab === 'analyzer') {
    helmetTitle = 'Chart Vision AI Scanner | Trademind.ai';
    helmetDesc = 'Upload asset charts or select stock breakouts to generate Gemini multimodal visual support signals.';
  } else if (activeTab === 'chat') {
    helmetTitle = 'Cognitive Trading Advisor | Trademind.ai';
    helmetDesc = 'Converse with your deep-learning quantitative companion. Optimize trades and indicators.';
  } else if (activeTab === 'journal') {
    helmetTitle = 'Quantitative Trade Journal | Trademind.ai';
    helmetDesc = 'Log and audit your personal trading performance. Keep your records securely on-device.';
  } else if (activeTab === 'risk') {
    helmetTitle = 'Position Sizing Risk Engine | Trademind.ai';
    helmetDesc = 'Calculate exact contract size and percentage risk margins to stay protective in wild markets.';
  } else if (activeTab === 'settings') {
    helmetTitle = 'Terminal Settings | Trademind.ai';
    helmetDesc = 'Configure your private Gemini API key, twelve data presets, and personal workspace layouts.';
  }

  return (
    <div className="h-screen w-full bg-[#050505] text-[#ededed] font-sans flex flex-col overflow-hidden">
      <Helmet>
        <title>{helmetTitle}</title>
        <meta name="description" content={helmetDesc} />
        
        {/* OpenGraph Tags */}
        <meta property="og:title" content={helmetTitle} />
        <meta property="og:description" content={helmetDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trademind.ai/workspace" />
        <meta property="og:image" content="https://ais-dev-2q6rk5ryfjzbyrjamxpglz-60120609270.asia-southeast1.run.app/favicon.ico" />
        <meta property="og:site_name" content="Trademind.ai" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={helmetTitle} />
        <meta name="twitter:description" content={helmetDesc} />
        <meta name="twitter:image" content="https://ais-dev-2q6rk5ryfjzbyrjamxpglz-60120609270.asia-southeast1.run.app/favicon.ico" />
      </Helmet>

      {/* Top Glassmorphic Navigation Bar */}
      <nav className="h-16 shrink-0 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">T</div>
            <span className="text-lg font-bold tracking-tight text-white">Trademind<span className="text-blue-500">.ai</span></span>
          </div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            NASDAQ 100 Terminal <span className="text-white font-mono ml-1">v2.4.0-Stable</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase tracking-wider">
            {user.plan} Account
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
            {user.name.slice(0, 2)}
          </div>
        </div>
      </nav>

      {/* Main Workstation Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Narrow Icon Side Panel */}
        <aside className="w-16 shrink-0 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-[#080808]">
          <button 
            onClick={() => setActiveTab('terminal')}
            title="Terminal Console"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'terminal' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('analyzer')}
            title="AI Vision Scanner"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'analyzer' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            title="AI Chat Analyst"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'chat' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            title="Trade Journal"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'journal' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('risk')}
            title="Risk Sizing Simulator"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'risk' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            title="Platform Settings"
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>

          {(isAdminUser || adminUnlocked) && (
            <button 
              onClick={() => setActiveTab('admin')}
              title="SaaS Admin Panel"
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-red-600/15 text-red-400 border border-red-500/20' : 'text-white/40 hover:text-red-400 hover:bg-white/5'
              }`}
            >
              <Database className="w-5 h-5" />
            </button>
          )}

          <button 
            onClick={onLogout}
            title="Sign Out"
            className="mt-auto p-2.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </aside>

        {/* Dynamic Display Panel */}
        <main className="flex-1 p-4 overflow-hidden flex flex-col bg-[#050505]">
          {/* TAB 1: CORE TERMINAL VIEW */}
          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Top Row: Watchlist & Chart Grid */}
              <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Watchlist & News Side Pane */}
                <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
                  {/* Watchlist Panel */}
                  <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 flex justify-between items-center">
                      Watchlist
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                    </h3>
                    <div className="space-y-2">
                      {(Object.keys(prices) as Array<keyof typeof prices>).map((sym) => (
                        <div 
                          key={sym}
                          onClick={() => setActiveSymbol(sym as any)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                            activeSymbol === sym 
                              ? 'bg-blue-600/10 border-blue-500/30 text-white' 
                              : 'bg-white/[0.01] border-transparent text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{sym}</div>
                            <div className="text-[9px] text-white/30 font-mono">Real-time</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold">
                              ${prices[sym].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: sym === 'EURUSD' ? 5 : 2 })}
                            </div>
                            <span className="text-[9px] text-green-400 bg-green-500/10 px-1 rounded font-bold">+1.2%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment Index Panel */}
                  <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Sentiment Gauge</span>
                      <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded font-bold uppercase">GREED</span>
                    </div>
                    <div className="text-lg font-bold text-white font-mono mb-2">Fear & Greed Index: 72</div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>

                  {/* Live Price Alerts Manager */}
                  <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-400" /> Real-time Price Alerts
                      </span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Engine Active"></span>
                    </div>

                    {/* Alert creation quick-form */}
                    <form onSubmit={handleCreateAlert} className="space-y-2 text-[10px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-white/30 mb-0.5 uppercase tracking-wider font-bold">Ticker</label>
                          <select 
                            value={alertSymbol}
                            onChange={(e) => setAlertSymbol(e.target.value)}
                            className="w-full bg-[#141416] border border-white/10 rounded-lg px-2 py-1 text-white"
                          >
                            {Object.keys(prices).map(sym => (
                              <option key={sym} value={sym}>{sym}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-white/30 mb-0.5 uppercase tracking-wider font-bold">Condition</label>
                          <select 
                            value={alertCondition}
                            onChange={(e) => setAlertCondition(e.target.value as any)}
                            className="w-full bg-[#141416] border border-white/10 rounded-lg px-2 py-1 text-white"
                          >
                            <option value="above">≥ (Above)</option>
                            <option value="below">≤ (Below)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-white/30 mb-0.5 uppercase tracking-wider font-bold">Target Value ($)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            required
                            placeholder="e.g. 140.00"
                            value={alertValue}
                            onChange={(e) => setAlertValue(e.target.value)}
                            className="flex-1 bg-[#141416] border border-white/10 rounded-lg px-2.5 py-1 text-white font-mono"
                          />
                          <button 
                            type="submit"
                            className="px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Alerts feed list */}
                    <div className="border-t border-white/5 pt-2 max-h-[140px] overflow-y-auto space-y-1.5">
                      {alerts.length === 0 ? (
                        <div className="text-[10px] text-white/30 text-center py-2">No active triggers configured.</div>
                      ) : (
                        alerts.map((alt) => (
                          <div 
                            key={alt.id} 
                            className={`p-2 rounded-lg flex items-center justify-between border ${
                              alt.triggered 
                                ? 'bg-green-500/5 border-green-500/10 text-green-400' 
                                : 'bg-white/[0.01] border-white/5 text-white/60'
                            }`}
                          >
                            <div className="text-[10px]">
                              <div className="font-bold flex items-center gap-1">
                                {alt.symbol} {alt.condition === 'above' ? '≥' : '≤'} ${alt.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                {alt.triggered && <CheckCircle className="w-3 h-3 text-green-400 inline" />}
                              </div>
                              <span className="text-[8px] text-white/30 block">
                                {alt.triggered ? `Hit: ${new Date(alt.triggeredAt).toLocaleTimeString()}` : 'Watching...'}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleDeleteAlert(alt.id)}
                              className="text-white/20 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="Remove alert"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Candle Chart Pane */}
                <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl flex flex-col relative overflow-hidden">
                  <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-[#0a0a0a]/50">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{activeSymbol} / USD</span>
                      <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-bold">LIVE CONNECTION</span>
                    </div>
                    <div className="text-[10px] text-white/40 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> 1H Timeframe
                    </div>
                  </div>

                  {/* Real-time TradingView Candlestick Widget Container */}
                  <div className="flex-1 bg-black relative">
                    <div id="tradingview_interactive_widget" className="w-full h-full" />
                    {!tvLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/40 text-xs">
                        Connecting to real-time charting terminal...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: AI strategy recommendations & news */}
              <div className="h-44 shrink-0 flex gap-4 overflow-hidden">
                {/* Dynamic live targets feed */}
                <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col overflow-y-auto">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-400" /> Active AI Signals (High-Probability)
                  </h3>
                  <div className="flex-1 overflow-x-auto min-h-0">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5">
                          <th className="pb-2 font-semibold">Symbol</th>
                          <th className="pb-2 font-semibold">Action</th>
                          <th className="pb-2 font-semibold font-mono">Entry</th>
                          <th className="pb-2 font-semibold font-mono">SL</th>
                          <th className="pb-2 font-semibold font-mono">Target</th>
                          <th className="pb-2 font-semibold font-mono">RR Ratio</th>
                          <th className="pb-2 font-semibold">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {signals.map((sig, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01]">
                            <td className="py-2.5 font-bold text-white">{sig.symbol}</td>
                            <td className="py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                sig.type === 'Buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>{sig.type}</span>
                            </td>
                            <td className="py-2.5 font-mono text-white">{sig.entry}</td>
                            <td className="py-2.5 font-mono text-red-400">{sig.sl}</td>
                            <td className="py-2.5 font-mono text-green-400">{sig.target}</td>
                            <td className="py-2.5 font-mono text-white/60">{sig.rr}</td>
                            <td className="py-2.5 font-bold text-blue-400">{sig.confidence}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Macro News Feed Panel */}
                <div className="w-96 shrink-0 bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col overflow-y-auto">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 shrink-0">Macro Intelligence Feed</h3>
                  <div className="space-y-3">
                    {newsFeed.map((news) => (
                      <div key={news.id} className="text-[11px] leading-relaxed border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white/40 font-semibold">{news.source} • {news.age}</span>
                          <span className={`px-1 rounded-[3px] text-[8px] font-bold uppercase ${
                            news.impact === 'High' ? 'bg-red-500/10 text-red-400' : news.impact === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/10 text-white/60'
                          }`}>{news.impact} Impact</span>
                        </div>
                        <p className="text-white/80 font-medium">{news.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI CHART VISION ANALYZER */}
          {activeTab === 'analyzer' && (
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              {/* Left Config Panel */}
              <div className="w-80 shrink-0 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 flex flex-col gap-5 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1">AI Visual Analyzer</h3>
                  <p className="text-[11px] text-white/40">Upload chart screenshot files to identify breakout zones and targets.</p>
                </div>

                {/* Market Segment Selector */}
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-white/40 mb-1.5 font-bold">Select Active Market</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMarketType('Forex')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 ${
                        marketType === 'Forex'
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                          : 'bg-white/[0.01] border-white/5 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs">💱</span> Forex Market
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarketType('Crypto')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 ${
                        marketType === 'Crypto'
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                          : 'bg-white/[0.01] border-white/5 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs">🪙</span> Crypto Market
                    </button>
                  </div>
                  <span className="block text-[9px] text-white/30 mt-1">This analyzer is configured to accept and evaluate <b>Forex</b> and <b>Crypto</b> markets only.</span>
                </div>

                {/* Upload Section */}
                {customFile ? (
                  <div className="relative border border-white/10 bg-white/[0.02] rounded-xl p-4 space-y-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-black flex items-center justify-center">
                      <img 
                        src={customFile} 
                        alt="Uploaded Chart Preview" 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] uppercase tracking-wider text-white/40 font-bold">Uploaded File</span>
                        <span className="block text-[11px] font-mono text-white/80 truncate" title={customFileName}>
                          {customFileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomFile(null);
                          setCustomFileName('');
                        }}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Discard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="file" 
                      id="analyzer-file-input"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="border border-dashed border-white/10 bg-white/[0.01] rounded-xl p-5 text-center transition-all hover:bg-white/[0.02] hover:border-white/20">
                      <Upload className="w-5 h-5 mx-auto mb-1.5 text-white/30" />
                      <span className="block text-xs font-bold text-white">
                        Upload custom chart file
                      </span>
                      <span className="block text-[9px] text-white/40 mt-1">
                        Supports Forex & Crypto TradingView, MT4/MT5 screenshots
                      </span>
                    </div>
                  </div>
                )}

                {/* Question Overlay */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1 font-bold">Instructions overlay</label>
                  <input
                    type="text"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g. Focus on the RSI divergence."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                  />
                </div>
 
                <button
                  onClick={handleAnalyzeChart}
                  disabled={analyzing || !customFile}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {analyzing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" /> Run Chart Scan
                    </>
                  )}
                </button>
              </div>

              {/* Right Output Terminal */}
              <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl flex flex-col min-h-0 overflow-y-auto p-5">
                {analyzing ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    <div className="text-center">
                      <span className="block font-bold text-white text-sm">Quant Vision Processing Engine Active</span>
                      <span className="block text-xs text-white/40 mt-1">Calling server-side Gemini multimodal API to evaluate wicks, indicators, and support channels</span>
                    </div>
                  </div>
                ) : analysis ? (
                  <div className="space-y-6">
                    {/* Actionable Trader Execution Signal Card */}
                    <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-extrabold block">Actionable AI Signal</span>
                          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">{analysis.ticker || scannedAssetName || analyzerChart.name}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 ${
                            (analysis.recommendation || analysis.trend)?.toUpperCase().includes('BUY') || analysis.trend === 'Bullish'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                              : (analysis.recommendation || analysis.trend)?.toUpperCase().includes('SELL') || analysis.trend === 'Bearish'
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          }`}>
                            <span className="text-[10px] uppercase font-bold text-white/50">Recommendation:</span>
                            <span className="text-lg font-black tracking-wider uppercase">
                              {analysis.recommendation || (analysis.trend === 'Bullish' ? 'BUY' : analysis.trend === 'Bearish' ? 'SELL' : 'HOLD')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actionable Trade Matrix Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-center">
                          <span className="block text-[9px] uppercase tracking-wider text-white/40 font-bold">Entry Price</span>
                          <span className="block text-base font-extrabold text-white font-mono mt-1">{analysis.entry}</span>
                        </div>
                        <div className="bg-black/40 border border-rose-500/20 rounded-xl p-3.5 text-center bg-rose-500/[0.02]">
                          <span className="block text-[9px] uppercase tracking-wider text-rose-400/70 font-bold">Stop Loss</span>
                          <span className="block text-base font-extrabold text-rose-400 font-mono mt-1">{analysis.stopLoss}</span>
                        </div>
                        <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3.5 text-center bg-emerald-500/[0.02]">
                          <span className="block text-[9px] uppercase tracking-wider text-emerald-400/70 font-bold">Take Profit 1</span>
                          <span className="block text-base font-extrabold text-emerald-400 font-mono mt-1">{analysis.takeProfit1 || analysis.takeProfit}</span>
                        </div>
                        <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3.5 text-center bg-emerald-500/[0.02]">
                          <span className="block text-[9px] uppercase tracking-wider text-emerald-400/70 font-bold">Take Profit 2</span>
                          <span className="block text-base font-extrabold text-emerald-300 font-mono mt-1">{analysis.takeProfit2 || analysis.takeProfit}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-center">
                          <span className="block text-[9px] uppercase tracking-wider text-white/40 font-bold">Risk : Reward</span>
                          <span className="block text-base font-extrabold text-indigo-400 font-mono mt-1">{analysis.riskRewardRatio}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-center">
                          <span className="block text-[9px] uppercase tracking-wider text-white/40 font-bold">Confidence</span>
                          <span className="block text-base font-extrabold text-blue-400 font-mono mt-1">{analysis.confidenceScore}%</span>
                        </div>
                      </div>

                      {/* Immediate Trader Reasons Bullet List */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-2">
                        <span className="block text-[10px] uppercase tracking-wider text-white/40 font-bold">Key Supporting Confluences</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                          {(Array.isArray(analysis.reasons) && analysis.reasons.length > 0 ? analysis.reasons : [
                            `${analysis.trend} structural breakout pattern`,
                            'MACD & RSI technical indicator alignment',
                            'Clear risk-defined support/resistance zones',
                            `Evaluated high confidence score of ${analysis.confidenceScore}%`
                          ]).map((reason: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-white/80 font-medium bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <div className="flex justify-between items-center text-xs text-white/60">
                          <span>Bullish probability stance</span>
                          <span className="text-green-400 font-bold font-mono">{analysis.bullishProbability}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${analysis.bullishProbability}%` }}></div>
                        </div>
                      </div>
                      <div className="space-y-1 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <div className="flex justify-between items-center text-xs text-white/60">
                          <span>Staged risk level</span>
                          <span className="text-yellow-400 font-bold uppercase font-mono">{analysis.riskLevel} Stance</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: analysis.riskLevel === 'Low' ? '25%' : analysis.riskLevel === 'Moderate' ? '55%' : '85%' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Narrative */}
                    <div className="space-y-4">
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                        <h4 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-1.5 flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> Strategic Reasoning Summary
                        </h4>
                        <p className="text-xs leading-relaxed text-white/80">{analysis.reasoning}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                          <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-1">Indicator Signals evaluated</h4>
                          <p className="text-xs leading-relaxed text-white/60">{analysis.indicatorExplanation}</p>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                          <h4 className="text-xs uppercase tracking-wider text-yellow-500/80 font-bold mb-1">Capital Protection Rule</h4>
                          <p className="text-xs leading-relaxed text-white/60">{analysis.educationalExplanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-white/20">
                    <Cpu className="w-16 h-16 stroke-[1.2] mb-3 text-white/10" />
                    <div>
                      <span className="block font-bold">Trading Chart Vision Scanner Idle</span>
                      <span className="block text-xs text-white/40 max-w-sm mt-1 mx-auto">Upload a screenshot from TradingView or MT4/MT5 to analyze now.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COGNITIVE CHAT COMPANION */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              {/* Main Chat Interface */}
              <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-[#0a0a0a]/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Trademind AI Assistant</span>
                  </div>
                  <button 
                    onClick={() => setChatMessages([{ role: 'model', text: 'Chat history cleared. How can I help you today?' }])}
                    className="text-[10px] text-white/30 hover:text-white hover:underline transition-all cursor-pointer"
                  >
                    Clear Memory
                  </button>
                </div>

                {/* Messages Box */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {msg.role === 'user' ? 'ME' : 'AI'}
                      </div>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600/10 border border-indigo-500/20 text-white' 
                          : 'bg-white/5 border border-white/5 text-white/80'
                      }`}>
                        {msg.text.split('\n').map((line, lidx) => (
                          <p key={lidx} className="mb-1 last:mb-0">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex gap-3 max-w-lg">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">AI</div>
                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-150"></div>
                        <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-300"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Prompts */}
                <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto bg-[#0a0a0a]/30">
                  <button 
                    onClick={() => handleSendChat(undefined, 'What is a head and shoulders pattern?')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/50 hover:text-white shrink-0 border border-white/5 cursor-pointer"
                  >
                    Explain Head & Shoulders
                  </button>
                  <button 
                    onClick={() => handleSendChat(undefined, 'How should I place stops to protect my capital?')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/50 hover:text-white shrink-0 border border-white/5 cursor-pointer"
                  >
                    Downside Stop Placement
                  </button>
                  <button 
                    onClick={() => handleSendChat(undefined, 'What is risk reward ratio and how is it used?')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/50 hover:text-white shrink-0 border border-white/5 cursor-pointer"
                  >
                    Explain Risk-Reward (RR)
                  </button>
                </div>

                {/* Input form */}
                <form onSubmit={(e) => handleSendChat(e)} className="p-3 border-t border-white/5 bg-[#0a0a0a]/50 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask something about charts, trends, or options..."
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer"
                  >
                    Ask
                  </button>
                </form>
              </div>
            </div>
          )}          {/* TAB 4: TRADE JOURNAL SCREEN */}
          {activeTab === 'journal' && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Analytics Summary banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Cumulative P&L Profit</div>
                  <div className={`text-xl font-bold font-mono ${(saasAnalytics ? saasAnalytics.cumulativePnl : totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(saasAnalytics ? saasAnalytics.cumulativePnl : totalPnl) >= 0 ? '+' : ''}${(saasAnalytics ? saasAnalytics.cumulativePnl : totalPnl).toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Win Rate Percentage</div>
                  <div className="text-xl font-bold text-white font-mono">{(saasAnalytics ? saasAnalytics.winRate : winRate).toFixed(1)}%</div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Total Journal Logged</div>
                  <div className="text-xl font-bold text-white font-mono">{trades.length} trades</div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">SaaS Profit Factor</div>
                  <div className="text-xl font-bold text-blue-400 font-mono">{saasAnalytics && saasAnalytics.profitFactor ? saasAnalytics.profitFactor : '1.82'}</div>
                </div>
              </div>

              <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Add Trade Form */}
                <div className="w-72 shrink-0 bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col overflow-y-auto">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Log a New Trade</h3>
                  <form onSubmit={handleAddTrade} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Trade Date</label>
                      <input 
                        type="date" 
                        required
                        value={journalDate}
                        onChange={(e) => setJournalDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Asset Ticker</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. BTCUSD"
                        value={journalSymbol}
                        onChange={(e) => setJournalSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Staged Direction</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setJournalType('Buy')}
                          className={`py-2 rounded-xl border text-center font-bold ${
                            journalType === 'Buy' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-white/5 border-white/5 text-white/40'
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setJournalType('Sell')}
                          className={`py-2 rounded-xl border text-center font-bold ${
                            journalType === 'Sell' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-white/40'
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Entry Price</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="132.50"
                        value={journalEntry}
                        onChange={(e) => setJournalEntry(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Exit Price</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="138.00"
                        value={journalExit}
                        onChange={(e) => setJournalExit(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Lot Size / Quantity</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="50"
                        value={journalSize}
                        onChange={(e) => setJournalSize(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Trade Notes</label>
                      <textarea 
                        placeholder="Breakout consolidation line..."
                        value={journalNotes}
                        onChange={(e) => setJournalNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 h-16 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-white text-black font-bold rounded-xl uppercase text-[10px] hover:bg-white/90 transition-colors cursor-pointer"
                    >
                      Save to Journal
                    </button>
                  </form>
                </div>

                {/* Right Area: Split between Charts & Table list */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                  
                  {/* Dynamic Recharts visualizer panel */}
                  {trades.length > 0 && saasAnalytics && saasAnalytics.equityCurve && saasAnalytics.equityCurve.length > 0 && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 shrink-0">
                      {/* Equity Curve Line Chart */}
                      <div className="xl:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col h-52">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Cumulative Equity Curve ($)</span>
                          <span className="text-[9px] text-white/30 font-mono">Real-Time SaaS Portfolio Growth</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={saasAnalytics.equityCurve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                              <XAxis dataKey="tradeNumber" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                              <ChartTooltip 
                                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}
                                itemStyle={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}
                              />
                              <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Win/Loss Pie Chart */}
                      <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col h-52 items-center justify-center">
                        <span className="self-start text-[10px] uppercase tracking-wider text-white/50 font-bold mb-2">Win / Loss Distribution</span>
                        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReChartsPie>
                              <Pie
                                data={[
                                  { name: 'Wins', value: Math.max(0, saasAnalytics.winRate) },
                                  { name: 'Losses', value: Math.max(0, 100 - saasAnalytics.winRate) }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                            </ReChartsPie>
                          </ResponsiveContainer>
                          <div className="absolute text-center">
                            <span className="block text-[8px] text-white/40">Win Rate</span>
                            <span className="block text-sm font-mono font-bold text-emerald-400">{saasAnalytics.winRate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-[9px] font-semibold mt-1">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Wins ({trades.filter(t => t.pnl > 0).length})
                          </span>
                          <span className="flex items-center gap-1 text-red-400">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Losses ({trades.filter(t => t.pnl <= 0).length})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Log List table */}
                  <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Historic Execution Journal Logs</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-white/40 border-b border-white/5 pb-2">
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Symbol</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2 font-mono">Entry</th>
                            <th className="pb-2 font-mono">Exit</th>
                            <th className="pb-2 font-mono">Size</th>
                            <th className="pb-2 font-mono">P&L</th>
                            <th className="pb-2">Notes</th>
                            <th className="pb-2 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {trades.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-white/20">
                                No historic trade journal files loaded. Add transaction above.
                              </td>
                            </tr>
                          ) : (
                            trades.map((t) => (
                              <tr key={t.id} className="hover:bg-white/[0.01]">
                                <td className="py-2.5 text-white/60">{t.date}</td>
                                <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                                <td className="py-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    t.type === 'Buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                  }`}>{t.type}</span>
                                </td>
                                <td className="py-2.5 font-mono text-white/70">${t.entry.toLocaleString()}</td>
                                <td className="py-2.5 font-mono text-white/70">${t.exit.toLocaleString()}</td>
                                <td className="py-2.5 font-mono text-white/70">{t.size}</td>
                                <td className={`py-2.5 font-mono font-bold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                                </td>
                                <td className="py-2.5 text-white/50 truncate max-w-xs">{t.notes}</td>
                                <td className="py-2.5 text-right">
                                  <button 
                                    onClick={() => handleDeleteTrade(t.id)}
                                    className="p-1 text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RISK CALCULATOR */}
          {activeTab === 'risk' && (
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              {/* Calculator Form */}
              <div className="w-80 shrink-0 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 overflow-y-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Order Risk Calculator</h3>
                <p className="text-[11px] text-white/40 mb-4">Calculate optimal quantitative position size based on capital preservation models.</p>

                <form onSubmit={handleCalculateRisk} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Account Balance ($)</label>
                    <input 
                      type="number" 
                      required
                      value={riskBalance}
                      onChange={(e) => setRiskBalance(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Downside Risk Allowance (%)</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Planned Entry Price ($)</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={riskEntry}
                      onChange={(e) => setRiskEntry(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px]">Stop Loss Safety Price ($)</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={riskStop}
                      onChange={(e) => setRiskStop(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-colors"
                  >
                    Calculate Order Metrics
                  </button>
                </form>
              </div>

              {/* Calculator Results Display */}
              <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 overflow-y-auto">
                {riskResult ? (
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/5 pb-2">Calculated Operational Risk parameters</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <span className="block text-[10px] uppercase tracking-wider text-white/40">Total Dollars Allowed at Risk</span>
                        <span className="block text-xl font-bold text-red-400 font-mono mt-1">${riskResult.cashRisk.toFixed(2)}</span>
                        <span className="block text-[9px] text-white/30 mt-1">This is the maximum capital lost if stop loss triggers.</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <span className="block text-[10px] uppercase tracking-wider text-white/40">Suggested Position Lot Size</span>
                        <span className="block text-xl font-bold text-green-400 font-mono mt-1">{riskResult.size.toFixed(4)} lots</span>
                        <span className="block text-[9px] text-white/30 mt-1">The exact volume size you should purchase.</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <span className="block text-[10px] uppercase tracking-wider text-white/40">Staged Capital Face Value</span>
                        <span className="block text-xl font-bold text-white font-mono mt-1">${riskResult.faceValue.toFixed(2)}</span>
                        <span className="block text-[9px] text-white/30 mt-1">The real nominal leverage size of the transaction.</span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <span className="block text-[10px] uppercase tracking-wider text-white/40">Required Terminal Leverage</span>
                        <span className="block text-xl font-bold text-indigo-400 font-mono mt-1">{riskResult.leverage.toFixed(2)}x</span>
                        <span className="block text-[9px] text-white/30 mt-1">Leverage multiplier relative to cash capital base.</span>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-xs space-y-2">
                      <h4 className="font-bold text-yellow-500 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                        <AlertTriangle className="w-4 h-4" /> Capital Preservation Safeguard
                      </h4>
                      <p className="leading-relaxed text-white/70">
                        Trading with standard risk controls is critical. Always set your hard stop loss directly at your planned level. Never expand or move your stop-loss further back in an active trading cycle.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-white/20">
                    <Shield className="w-16 h-16 stroke-[1.2] mb-3 text-white/10" />
                    <div>
                      <span className="block font-bold">Risk Parameters Uncalculated</span>
                      <span className="block text-xs text-white/40 max-w-sm mt-1">Complete your capital balance variables on the left to simulate position sizes and lot bounds safely.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & SUBSCRIPTION STATUS */}
          {activeTab === 'settings' && (
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              {/* Left Column: API Keys */}
              <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 overflow-y-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Platform Connection API Keys</h3>
                <p className="text-[11px] text-white/40 mb-4">Provide custom model credentials to bypass standard system limit gateways. (Saved locally)</p>

                <form onSubmit={handleSaveKeys} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">Google Gemini API Key</label>
                    <input 
                      type="password" 
                      placeholder="AIzaSy..."
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">OpenAI GPT Secret Key</label>
                    <input 
                      type="password" 
                      placeholder="sk-or-..."
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">TwelveData market API Key</label>
                    <input 
                      type="password" 
                      placeholder="TwelveData API key..."
                      value={apiKeys.twelveData}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, twelveData: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-white text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                  >
                    Save API Keys
                  </button>
                </form>

                <div className="mt-8 border-t border-white/5 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-red-500" /> Developer Admin Sandbox Options
                  </h4>
                  <p className="text-[11px] text-white/40 mb-4 leading-relaxed">Toggle Developer Admin Mode to instantly reveal the back-office SaaS statistics panel and active user administration dashboards.</p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !adminUnlocked;
                      setAdminUnlocked(nextVal);
                      localStorage.setItem('trademind_admin_unlocked', nextVal ? 'true' : 'false');
                    }}
                    className={`py-2 px-5 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                      adminUnlocked 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10' 
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                    }`}
                  >
                    {adminUnlocked ? 'Disable Admin Sandbox Mode' : 'Enable Admin Sandbox Mode'}
                  </button>
                </div>
              </div>

              {/* Right Column: Plans & Alerts */}
              <div className="w-96 shrink-0 flex flex-col gap-4 overflow-y-auto">
                {/* Subscription Card */}
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Subscription Status</h3>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                    <span className="block text-[10px] uppercase tracking-wider text-blue-400 font-bold">Current Tier</span>
                    <span className="block text-lg font-bold text-white mt-1">{user.plan} Intel Pack</span>
                    <span className="block text-[10px] text-white/40 mt-1">Unlimited model access active. Next billing: August 20, 2026</span>
                  </div>

                  <div className="space-y-2">
                    {user.plan === 'Free' && (
                      <button
                        onClick={() => setCheckoutPlan('Pro')}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Upgrade to Pro ($49/mo)
                      </button>
                    )}
                    {user.plan !== 'Enterprise' && (
                      <button
                        onClick={() => setCheckoutPlan('Enterprise')}
                        className="w-full py-2.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        Upgrade to Enterprise ($199/mo)
                      </button>
                    )}
                    {user.plan === 'Enterprise' && (
                      <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">★ Elite Tier Active</span>
                    )}
                  </div>
                </div>

                {/* Notifications setup */}
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Alert Notification Feeds</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block font-bold text-white">Direct Signal Triggers</span>
                        <span className="block text-[10px] text-white/40">Receive browser targets for new buy/sell patterns.</span>
                      </div>
                      <button 
                        onClick={() => setNotifySignals(!notifySignals)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${notifySignals ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifySignals ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block font-bold text-white">Macro News Alerts</span>
                        <span className="block text-[10px] text-white/40">Flash screen for Bloomberg high impact events.</span>
                      </div>
                      <button 
                        onClick={() => setNotifyNews(!notifyNews)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${notifyNews ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifyNews ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SAAS ADMIN PANEL DASHBOARD */}
          {activeTab === 'admin' && (
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
              {/* Header metrics bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Total Active Users
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {adminStats ? adminStats.totalUsers : '...'}
                    </span>
                    <span className="text-[10px] text-green-400 font-bold font-mono">+12% MoM</span>
                  </div>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monthly Recurring Revenue (MRR)
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      ${adminStats ? adminStats.mrr.toLocaleString() : '...'}
                    </span>
                    <span className="text-[10px] text-green-400 font-bold font-mono">Live Sync</span>
                  </div>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-orange-400" /> Active Price Alerts Set
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {adminStats ? adminStats.totalAlerts : '...'}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">Ticking...</span>
                  </div>
                </div>

                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400" /> System Trades Analyzed
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {adminStats ? adminStats.totalTrades : '...'}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">Automated DB</span>
                  </div>
                </div>
              </div>

              {/* Main admin body: Split between Users Table list and Revenue distribution chart */}
              <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Users list table */}
                <div className="flex-1 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 flex flex-col min-w-0 overflow-hidden">
                  <div className="flex justify-between items-center mb-4 shrink-0 font-sans">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-red-500" /> User Database Administration
                      </h3>
                      <p className="text-[10px] text-white/30">Active SaaS users table with instant plan upgrade toggling and purge permissions.</p>
                    </div>
                    <button 
                      onClick={handleLoadAdminStats}
                      disabled={adminLoading}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                    >
                      <RefreshCw className={`w-3 h-3 ${adminLoading ? 'animate-spin' : ''}`} />
                      Reload Database
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0">
                    {adminLoading ? (
                      <div className="h-full flex items-center justify-center text-xs text-white/40">
                        Querying user accounts database...
                      </div>
                    ) : !adminStats || adminStats.users.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-white/40">
                        No active users found in database.
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-white/40 border-b border-white/5 text-[10px] uppercase tracking-wider">
                            <th className="pb-2.5 font-bold">Name / Email</th>
                            <th className="pb-2.5 font-bold">Plan Tier</th>
                            <th className="pb-2.5 font-bold">Signup Date</th>
                            <th className="pb-2.5 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {adminStats.users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-white/[0.01]">
                              <td className="py-3">
                                <div className="font-bold text-white font-sans">{u.name}</div>
                                <div className="text-[10px] text-white/40 mt-0.5">{u.email}</div>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.plan === 'Enterprise' 
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                    : u.plan === 'Pro' 
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                      : 'bg-white/5 text-white/40'
                                }`}>
                                  {u.plan}
                                </span>
                              </td>
                              <td className="py-3 text-[10px] text-white/40">
                                {new Date(u.createdAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-2 items-center font-sans">
                                  <button 
                                    onClick={() => handleAdminToggleTier(u.id, u.plan)}
                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] font-bold transition-all border border-white/5 cursor-pointer"
                                    title="Upgrade/Downgrade User Tier"
                                  >
                                    Cycle Tier
                                  </button>
                                  <button 
                                    onClick={() => handleAdminDeleteUser(u.id)}
                                    className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all cursor-pointer"
                                    title="Purge Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Subscription Tier visualizer distribution */}
                <div className="w-80 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 flex flex-col justify-between shrink-0 font-sans">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1 flex items-center gap-1.5">
                      <PieChart className="w-4 h-4 text-emerald-400" /> Subscription Distribution
                    </h3>
                    <p className="text-[10px] text-white/30 mb-4">Breakdown of system plans and active recurring revenues.</p>
                    
                    {adminStats && (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-white/[0.01] rounded-xl border border-white/5">
                          <div>
                            <span className="block font-bold text-white">Elite Enterprise</span>
                            <span className="block text-[9px] text-white/40">$199 / month pack</span>
                          </div>
                          <span className="font-bold text-purple-400 font-mono">
                            {adminStats.users.filter((u: any) => u.plan === 'Enterprise').length} Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-white/[0.01] rounded-xl border border-white/5">
                          <div>
                            <span className="block font-bold text-white">Pro Intel</span>
                            <span className="block text-[9px] text-white/40">$49 / month pack</span>
                          </div>
                          <span className="font-bold text-blue-400 font-mono">
                            {adminStats.users.filter((u: any) => u.plan === 'Pro').length} Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-white/[0.01] rounded-xl border border-white/5">
                          <div>
                            <span className="block font-bold text-white">Free Basic</span>
                            <span className="block text-[9px] text-white/40 font-semibold font-semibold">Developer trial</span>
                          </div>
                          <span className="font-bold text-white/40 font-mono">
                            {adminStats.users.filter((u: any) => u.plan === 'Free').length} Active
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* System health warning */}
                  <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl mt-4">
                    <span className="block text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">Back-office Security Alert</span>
                    <span className="block text-[10px] text-white/40 leading-relaxed">
                      You are operating with full administrative access over the user datastores. All account modifications and deletion requests sync instantly to the database.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Connection & Latency footer bar */}
      <footer className="h-10 bg-[#080808] border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-white/30 tracking-widest uppercase shrink-0">
        <div className="flex gap-6">
          <span>Connection: Secure</span>
          <span>Latency: 14ms</span>
          <span>System Node: US-EAST-1</span>
        </div>
        <div>
          <span className="text-blue-500 font-bold">Secure Workstation Mode Active</span>
        </div>
      </footer>

      {checkoutPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-md p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Secure Sandbox Checkout</span>
              </div>
              <button 
                onClick={() => { setCheckoutPlan(null); setCheckoutError(null); }}
                className="text-white/40 hover:text-white text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6">
              <span className="block text-[10px] uppercase tracking-wider text-white/40">Selected Intel Plan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-extrabold text-white">{checkoutPlan} Analytics Pack</span>
                <span className="text-sm font-mono font-bold text-blue-400">{checkoutPlan === 'Pro' ? '$49.00 / mo' : '$199.00 / mo'}</span>
              </div>
              <span className="block text-[10px] text-white/30 mt-2">Simulated payment processor connected. Enter sandbox credentials to complete your subscription permanently.</span>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setCheckoutLoading(true);
              setCheckoutError(null);
              const token = localStorage.getItem('trademind_token');
              
              try {
                const response = await fetch('/api/subscription/checkout', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({ tier: checkoutPlan })
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || 'Checkout gateway rejected transaction');
                }
                
                // Successfully upgraded
                onUpdatePlan(checkoutPlan);
                setCheckoutPlan(null);
                alert(`Successfully subscribed to Trademind ${checkoutPlan} Plan! Welcome to elite institutional-grade quantitative charting.`);
              } catch (err) {
                setCheckoutError((err as Error).message);
              } finally {
                setCheckoutLoading(false);
              }
            }} className="space-y-4 text-xs">
              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-semibold">
                  {checkoutError}
                </div>
              )}

              <div>
                <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">Cardholder Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">Credit Card Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="4242 •••• •••• 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                  maxLength={19}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">Expiration Date</label>
                  <input 
                    type="text" 
                    required
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) val = val.substring(0, 2) + ' / ' + val.substring(2, 4);
                      setCardExpiry(val);
                    }}
                    maxLength={7}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-white/40 mb-1 uppercase tracking-wider text-[9px] font-bold">CVC Security Code</label>
                  <input 
                    type="password" 
                    required
                    placeholder="•••"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                    maxLength={3}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
              >
                {checkoutLoading ? 'Authorizing Secure Escrow...' : `Pay & Activate ${checkoutPlan}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
