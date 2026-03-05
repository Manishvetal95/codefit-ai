import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Code,
    Activity,
    Zap,
    Flame,
    Award,
    ChevronLeft,
    BarChart3,
    Calendar,
    Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        codingStreak: user?.codingStreak || 0,
        fitnessStreak: user?.fitnessStreak || 0,
        xp: user?.experiencePoints || 0,
        history: user?.activityHistory || []
    });

    // Mock data for heatmap if history is empty (for demo/hackathon impact)
    const generateHeatmapData = () => {
        const data = [];
        const today = new Date();
        for (let i = 0; i < 91; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);

            // Randomly fill some days if history is empty
            const hasActivity = stats.history.find(h =>
                new Date(h.date).toDateString() === date.toDateString()
            );

            data.push({
                date: date,
                intensity: hasActivity ? hasActivity.intensity : (Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0),
                type: hasActivity ? hasActivity.type : (Math.random() > 0.8 ? 'coding' : 'fitness')
            });
        }
        return data.reverse();
    };

    const heatmapData = generateHeatmapData();

    const getIntensityColor = (intensity, type) => {
        if (intensity === 0) return 'bg-white/5';
        if (type === 'coding') {
            if (intensity === 1) return 'bg-green-900/40 text-green-400';
            if (intensity === 2) return 'bg-green-700/60 text-green-300';
            return 'bg-green-500 text-white';
        }
        if (type === 'fitness') {
            if (intensity === 1) return 'bg-blue-900/40 text-blue-400';
            if (intensity === 2) return 'bg-blue-700/60 text-blue-300';
            return 'bg-blue-500 text-white';
        }
        return 'bg-purple-500 text-white';
    };

    return (
        <div className="min-h-screen bg-[#0d0e12] text-gray-100 font-sans selection:bg-green-500/30 overflow-x-hidden">
            {/* Background Pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1a1b23_0%,_#0d0e12_100%)] z-0" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/')}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                        >
                            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        </motion.button>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white/40">Innovation <span className="text-green-500 bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent animate-gradient-x">Dashboard</span></h1>
                            <p className="text-zinc-400 font-medium tracking-tight">Tracking your journey to engineering excellence.</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-6 bg-white/[0.03] border border-white/10 p-4 rounded-3xl backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Experience</p>
                                <p className="text-lg font-mono font-bold">{stats.xp} XP</p>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                <Award size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Level</p>
                                <p className="text-lg font-mono font-bold">Lvl {Math.floor(stats.xp / 100) + 1}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group cursor-pointer shadow-2xl hover:shadow-green-500/10 before:absolute before:inset-0 before:border before:border-white/5 before:rounded-[2.5rem] before:pointer-events-none"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Code size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                                <Flame className="text-white" fill="currentColor" />
                            </div>
                            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Coding Streak</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-mono font-black text-white">{stats.codingStreak}</span>
                                <span className="text-green-500 font-bold">Days</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group cursor-pointer shadow-2xl hover:shadow-blue-500/10 before:absolute before:inset-0 before:border before:border-white/5 before:rounded-[2.5rem] before:pointer-events-none"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Activity size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                <Target className="text-white" />
                            </div>
                            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Fitness Streak</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-mono font-black text-white">{stats.fitnessStreak}</span>
                                <span className="text-blue-500 font-bold">Days</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#1a1b23] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center items-center text-center relative overflow-hidden shadow-2xl before:absolute before:inset-0 before:border before:border-white/5 before:rounded-[2.5rem] before:pointer-events-none"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center mb-4 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin-slow" />
                            <span className="text-2xl font-black">{Math.floor(((stats.xp % 100) / 100) * 100)}%</span>
                        </div>
                        <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">To Next Level</h3>
                        <p className="text-[10px] text-gray-600 font-bold">{100 - (stats.xp % 100)} XP Remaining</p>
                    </motion.div>
                </div>

                {/* Heatmap Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/5 border border-white/5 rounded-[3rem] p-10 backdrop-blur-3xl"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <Calendar className="text-gray-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Activity Heatmap</h2>
                                <p className="text-sm text-gray-500">Your consistency over the last 90 days.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                                <span>Coding</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                                <span>Fitness</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Month Labels */}
                        <div className="flex gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest h-4">
                            {Array.from({ length: 13 }).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (12 - i) * 7);
                                const month = date.toLocaleString('default', { month: 'short' });
                                // Show month if it's the start of a month or first column
                                return (
                                    <div key={i} className="w-14 shrink-0">
                                        {i % 4 === 0 ? month : ''}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            {heatmapData.map((day, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + (i * 0.005) }}
                                    className={`w-3.5 h-3.5 rounded-sm sm:w-4 sm:h-4 ${getIntensityColor(day.intensity, day.type)} transition-all hover:ring-2 hover:ring-white/50 cursor-help relative group`}
                                    title={`${day.date.toDateString()}: ${day.intensity} sessions`}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                        {day.date.toDateString()}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-green-500" />
                                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Coding Metrics</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span>Logic Master</span>
                                        <span className="text-green-500">85%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[85%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span>Problem Consistency</span>
                                        <span className="text-green-500">62%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[62%]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-blue-500" />
                                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Fitness Metrics</h4>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span>Physical Discipline</span>
                                        <span className="text-blue-500">74%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[74%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span>Recovery Focus</span>
                                        <span className="text-blue-500">40%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[40%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Custom Styles */}
            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 5s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
