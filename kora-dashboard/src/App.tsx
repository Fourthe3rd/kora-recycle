import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Server, DollarSign, ShieldCheck, RefreshCw, Terminal, Send } from 'lucide-react';

interface Log { address: string; status: string; updated_at: number; }
interface ChatMessage { role: 'user' | 'bot'; text: string; }

function App() {
  const [data, setData] = useState<any>(null);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Kora Operator Console v2.2 initialized. Waiting for input...' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll Metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:3001/metrics');
        setData(await res.json());
      } catch (e) { console.error("Backend Offline"); }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setInput('');
    setChat(prev => [...prev, { role: 'user', text: cmd }]);
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:3001/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd })
      });
      const response = await res.json();

      // Artificial delay for "Bot Thinking" feel
      setTimeout(() => {
        setChat(prev => [...prev, { role: 'bot', text: response.message }]);
        setIsTyping(false);
      }, 600);

    } catch (err) {
      setChat(prev => [...prev, { role: 'bot', text: 'Error: Uplink severed.' }]);
      setIsTyping(false);
    }
  };

  if (!data) return <div className="h-screen w-full flex items-center justify-center text-kora-primary font-mono animate-pulse">CONNECTING TO KORA UPLINK...</div>;

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">

      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-kora-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-2">
            <RefreshCw className="text-kora-primary" />
            KORA<span className="text-kora-primary">RECYCLE</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">INFRASTRUCTURE GARBAGE COLLECTOR // V2.2</p>
        </div>
        <div className="flex gap-4">
          <StatusBadge label="NETWORK" value={data.network} color="bg-purple-500/10 text-purple-400 border-purple-500/20" />
          <StatusBadge label="SYSTEM" value={data.system_status} color="bg-green-500/10 text-green-400 border-green-500/20" />
        </div>
      </header>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="TOTAL USD SAVED" value={`$${data.stats.usd_saved}`} icon={<DollarSign className="text-emerald-400" />} gradient="from-emerald-900/20" highlight />
        <MetricCard title="SOL RECOVERED" value={`${data.stats.sol_recovered.toFixed(4)} SOL`} icon={<Database className="text-purple-400" />} gradient="from-purple-900/20" />
        <MetricCard title="ACCOUNTS CLOSED" value={data.stats.accounts_reclaimed} icon={<ShieldCheck className="text-blue-400" />} gradient="from-blue-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">

        {/* LIVE LOGS (Left) */}
        <div className="lg:col-span-2 bg-kora-card border border-kora-border rounded-xl p-6 relative overflow-hidden flex flex-col">
          <h3 className="text-gray-400 font-mono text-xs uppercase mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Activity Stream
          </h3>
          <div className="space-y-3 flex-1">
            <AnimatePresence>
              {data.logs.map((log: any) => (
                <motion.div key={`${log.address}-${log.status}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5">
                  <span className="font-mono text-sm text-gray-300">{log.address.slice(0, 20)}...</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBadge(log.status)}`}>{log.status}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* TERMINAL BOT (Right) */}
        <div className="bg-black border border-gray-800 rounded-xl p-0 flex flex-col h-[400px] shadow-2xl overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono">OPERATOR_CONSOLE</span>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-sm">
            {chat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-kora-primary text-black font-bold' : 'bg-gray-800 text-gray-200'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-gray-500 text-xs animate-pulse">Bot is processing transaction...</div>}
          </div>

          <form onSubmit={handleCommand} className="p-2 border-t border-gray-800 bg-gray-900 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Try: /seed 4"
              className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none px-2"
            />
            <button type="submit" className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded transition"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helpers
function MetricCard({ title, value, icon, gradient, highlight }: any) {
  return (
    <div className={`bg-kora-card border border-kora-border rounded-xl p-6 relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4"><h3 className="text-gray-400 font-mono text-xs uppercase">{title}</h3><div className="p-2 bg-white/5 rounded-lg">{icon}</div></div>
        <div className={`text-4xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-gray-200'}`}>{value}</div>
      </div>
    </div>
  );
}
function StatusBadge({ label, value, color }: any) {
  return <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${color}`}><span className="text-xs font-bold">{label}</span><span className="text-sm font-mono">{value}</span></div>;
}
function getStatusBadge(status: string) {
  if (status === 'RECLAIMED') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (status === 'SAFE_TO_REAP') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
}
export default App;