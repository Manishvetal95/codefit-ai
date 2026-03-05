import { useState, useEffect } from 'react';
import { Plus, MessageSquare, LogOut, Trash2, Settings, X, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import { motion } from 'framer-motion';
import SettingsModal from './SettingsModal';

const Sidebar = ({ currentChatId, onSelectChat, onNewChat, onClose, onOpenSettings }) => {
    const [chats, setChats] = useState([]);
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchChats();
    }, [currentChatId]); // Refresh when chat changes

    const fetchChats = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            const { data } = await axios.get('/api/chat', config);
            setChats(data);
        } catch (error) {
            console.error(error);
        }
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this chat?')) return;

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            await axios.delete(`/api/chat/${id}`, config);
            fetchChats();
            if (currentChatId === id) {
                onNewChat();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-[#0d0e12]/80 backdrop-blur-xl w-[260px] h-screen flex flex-col font-sans border-r border-white/5 relative overflow-hidden">
            {/* Ambient Background Glow for Sidebar */}
            <div className="absolute top-0 -left-1/2 w-full h-1/2 bg-green-500/5 blur-[120px] pointer-events-none" />

            <div className="h-28 px-5 flex items-center justify-between border-b border-white/5 relative z-10 pt-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                        <img src={logo} alt="CodeFit AI" className="h-8 w-8 rounded-full shadow-lg" />
                    </div>
                    <span className="text-white font-extrabold text-xl tracking-tighter drop-shadow-md">
                        CodeFit<span className="text-green-500">AI</span>
                    </span>
                </div>
                {/* Close Button - Mobile Only */}
                <button
                    onClick={onClose}
                    className="md:hidden text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded-md transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 relative z-10 flex flex-col gap-2">
                <Link
                    to="/dashboard"
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 text-white text-sm font-semibold group shadow-lg"
                >
                    <BarChart3 size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    Innovation Dashboard
                </Link>

                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all duration-300 text-white text-sm font-semibold group shadow-lg hover:shadow-green-500/5 hover:border-green-500/30"
                >
                    <Plus size={18} className="text-green-500 group-hover:scale-125 transition-transform" />
                    New training session
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-2">
                <div className="flex flex-col gap-1 p-2">
                    <span className="text-[10px] font-bold text-gray-500 px-3 py-2 uppercase tracking-[0.2em]">History</span>
                    {chats.map((chat) => (
                        <motion.div
                            key={chat._id}
                            onClick={() => onSelectChat(chat._id)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm transition-all duration-300 relative overflow-hidden ${currentChatId === chat._id
                                ? 'text-white'
                                : 'text-zinc-500 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            {currentChatId === chat._id && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-white/10 border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {currentChatId === chat._id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-green-500 rounded-r-full shadow-[0_0_8px_rgba(34,197,94,0.6)] z-10" />
                            )}
                            <MessageSquare size={16} className={`relative z-10 ${currentChatId === chat._id ? "text-green-500" : "text-gray-500 group-hover:text-gray-400"}`} />
                            <div className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap font-medium relative z-10">
                                {chat.title}
                            </div>
                            <button
                                onClick={(e) => deleteChat(e, chat._id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1"
                            >
                                <Trash2 size={14} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="border-t border-white/5 p-3 bg-black/20 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all text-white text-sm group border border-transparent hover:border-white/5 shadow-inner">
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-600 to-green-800 text-white font-bold text-sm select-none shadow-lg border border-white/10">
                        {user?.profilePicture ? (
                            <img
                                src={user.profilePicture}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                            />
                        ) : (
                            user?.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 font-semibold select-none truncate">
                        {user?.username}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/5 rounded-lg transition-all"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>

                    <button
                        onClick={logout}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                        title="Log out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
