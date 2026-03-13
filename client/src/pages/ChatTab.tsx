import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMessages, sendMessage } from '../api';
import { Send, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatTab({ tournamentId }: { tournamentId: number }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getMessages(tournamentId);
                setMessages(res.data.messages || res.data || []);
            } catch (err) {
                console.error("Failed to load messages:", err);
            }
        };
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [tournamentId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await sendMessage(tournamentId, { content: text });
            setText('');
            // Optional: Reload messages immediately
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="glass-card rounded-[3rem] p-8 md:p-12 flex flex-col h-[600px] border border-slate-800/50 shadow-2xl relative overflow-hidden">

            <div className="flex items-center gap-4 mb-8 border-b border-slate-900 pb-6">
                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h2 className="font-black text-white uppercase tracking-tight">Channel: Tournament_Broadcasting</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">End-to-end encrypted interaction</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 px-4 scrollbar-hide">
                {messages.length > 0 ? (
                    messages.map((m, i) => {
                        const isMe = m.user_id === user?.id;
                        return (
                            <motion.div
                                key={m.id || i}
                                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`max-w-[80%] p-5 rounded-[2rem] text-sm font-bold shadow-xl border
                                    ${isMe ? 'bg-primary-600/90 text-white border-primary-500/30 rounded-tr-none' : 'bg-slate-900/80 text-slate-200 border-slate-800/50 rounded-tl-none'}`}
                                >
                                    <p className="leading-relaxed">{m.content || m.text}</p>
                                </div>
                                <div className="mt-2 flex items-center gap-3 px-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{m.user_name || 'System Entity'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-30 grayscale">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                            <MessageSquare size={24} className="text-slate-800" />
                        </div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Awaiting interaction initialization</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="mt-10 pt-8 border-t border-slate-900 flex gap-4">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Broadcast your status..."
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600 transition-all text-white placeholder:text-slate-700"
                />
                <button
                    disabled={sending}
                    className="bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl transition-all shadow-xl shadow-primary-950/40 disabled:opacity-50 group"
                >
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
            </form>

        </div>
    );
}
