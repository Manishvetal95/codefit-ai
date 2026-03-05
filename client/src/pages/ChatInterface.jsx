import { useState, useEffect, useRef } from 'react';
import {
    Send, User, Bot, Menu, Loader2, Paperclip, Mic, X,
    Plus, MessageSquare, Trash2, Settings, LogOut,
    Copy, Play, Square, Code, Activity, CheckSquare, Flame
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.jpg';

const ChatInterface = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const token = user?.token;
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [currentChatId, setCurrentChatId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // Sprint Mechanic State
    const [isSprintActive, setIsSprintActive] = useState(false);
    const [sprintTime, setSprintTime] = useState(25 * 60); // 25 mins
    const [sprintMode, setSprintMode] = useState('work'); // 'work' or 'break'

    useEffect(() => {
        let interval;
        if (isSprintActive && sprintTime > 0) {
            interval = setInterval(() => {
                setSprintTime(prev => prev - 1);
            }, 1000);
        } else if (sprintTime === 0) {
            const nextMode = sprintMode === 'work' ? 'break' : 'work';
            const nextTime = nextMode === 'work' ? 25 * 60 : 5 * 60;
            setSprintMode(nextMode);
            setSprintTime(nextTime);
            setIsSprintActive(false);
            alert(nextMode === 'break' ? "Time for a 5-min Mobility Break! 🧘‍♂️" : "Back to the Code Sprint! 💻");
        }
        return () => clearInterval(interval);
    }, [isSprintActive, sprintTime, sprintMode]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Multimodal States
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Handle File Selection
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // Handle Voice Recording
    const startRecording = async () => {
        try {
            console.log("Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Microphone access granted.");
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log("Audio chunk received:", event.data.size);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                console.log("Recording stopped. Processing chunks...");
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("Audio Blob created:", audioBlob.size, audioBlob.type);
                const audioFile = new File([audioBlob], "voice_recording.webm", { type: 'audio/webm' });
                setSelectedFile(audioFile);
                setPreviewUrl(URL.createObjectURL(audioBlob));

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            console.log("Recording started.");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please ensure permission is granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const clearAttachment = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if ((!input.trim() && !selectedFile) || loading) return;

        const userMessage = {
            role: 'user',
            content: input,
            attachment: previewUrl ? { type: selectedFile.type, url: previewUrl } : null
        };
        const tempChatId = currentChatId;

        // Optimistic update
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Clear attachment state immediately from UI but keep for sending
        const fileToSend = selectedFile;
        clearAttachment();

        try {
            const formData = new FormData();
            formData.append('message', userMessage.content);
            if (tempChatId) {
                formData.append('chatId', tempChatId);
            }
            if (fileToSend) {
                formData.append('file', fileToSend);
            }

            const res = await axios.post('/api/chat', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (!tempChatId) {
                setCurrentChatId(res.data.chat._id);
                // If it's a new chat, we might want to refresh the sidebar list in parent, 
                // but for now we just update local state.
            }

            const botMessage = { role: 'model', content: res.data.response };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage = { role: 'model', content: "Sorry, something went wrong. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const loadChat = async (chatId) => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/chat/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessages(res.data.messages);
            setCurrentChatId(chatId);
            setShowSidebar(false); // Close sidebar on mobile
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const createNewChat = () => {
        setMessages([]);
        setCurrentChatId(null);
        setShowSidebar(false);
    };

    return (
        <div className="flex h-screen bg-[#0d0e12] text-gray-100 overflow-hidden font-sans selection:bg-green-500/30">
            {/* Sidebar toggle for desktop/mobile handled by CSS */}
            <div className={`fixed inset-y-0 left-0 transform ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50 md:z-0 w-[260px] h-full flex-shrink-0 border-r border-white/5`}>
                <Sidebar
                    onSelectChat={loadChat}
                    onNewChat={createNewChat}
                    currentChatId={currentChatId}
                    onClose={() => setShowSidebar(false)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />
            </div>

            {/* Main Chat Content */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-transparent">
                {/* Mobile Header */}
                <div className="md:hidden flex h-20 items-center justify-between px-4 border-b border-white/5 bg-[#0d0e12]/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="CodeFit AI" className="h-7 w-7 rounded-full" />
                            <span className="font-bold text-lg tracking-tight text-white">CodeFit<span className="text-green-500">AI</span></span>
                        </div>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-green-900/20">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Sprint Mechanic Widget (Floating Top Right) */}
                <div className="absolute top-4 right-4 z-40 hidden md:block">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1a1b23]/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-4 border-l-4 border-l-green-500"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-none mb-1">
                                {sprintMode === 'work' ? 'Code Sprint' : 'Mobility Break'}
                            </span>
                            <motion.span
                                animate={isSprintActive ? { opacity: [1, 0.5, 1] } : {}}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-xl font-mono font-bold text-white leading-none"
                            >
                                {formatTime(sprintTime)}
                            </motion.span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSprintActive(!isSprintActive)}
                            className={`p-2 rounded-full transition-all ${isSprintActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        >
                            {isSprintActive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                    </motion.div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 pb-44 px-4 scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="min-h-full flex flex-col items-center pt-16 md:pt-28 text-center px-4 pb-10">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-8"
                            >
                                <img src={logo} alt="CodeFit AI" className="h-20 w-20 rounded-3xl shadow-2xl shadow-green-500/10 border border-white/10 p-2 bg-white/5" />
                            </motion.div>
                            <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">How can we <span className="text-green-500">train</span> today?</h2>
                            <p className="text-gray-400 max-w-md mb-8 text-lg font-medium">Master Data Structures or optimize your Fitness routine with your personal AI Mentor.</p>
                            <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
                                {[
                                    { icon: <Code size={18} />, title: "Explain Binary Search", desc: "Step-by-step visual logic", prompt: "Explain Binary Search with step-by-step visual logic." },
                                    { icon: <Activity size={18} />, title: "Post-workout Recovery", desc: "Stretches for coding hours", prompt: "Suggest post-workout recovery stretches specifically for long coding hours." },
                                    { icon: <CheckSquare size={18} />, title: "Review my Code", desc: "Optimization & Best practices", prompt: "Please review this code for optimization and best practices: " },
                                    { icon: <Flame size={18} />, title: "Nutrition for focus", desc: "Energy for high-intent work", prompt: "What is the best nutrition for maintaining focus during high-intent coding work?" }
                                ].map((step, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => setInput(step.prompt)}
                                        className="flex flex-col items-start p-4 bg-[#1a1b23] hover:bg-[#252630] border border-white/10 rounded-2xl transition-all group text-left shadow-lg hover:shadow-green-500/5 hover:border-green-500/30"
                                    >
                                        <div className="p-2 bg-white/5 rounded-lg text-green-500 mb-3 group-hover:scale-110 transition-transform">
                                            {step.icon}
                                        </div>
                                        <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{step.desc}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-8">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-6 p-6 rounded-3xl transition-all ${msg.role === 'model'
                                        ? 'bg-white/[0.03] border border-white/5 shadow-2xl backdrop-blur-sm'
                                        : 'bg-transparent'
                                        } ${messages[idx - 1]?.role === msg.role ? 'pt-0' : 'pt-6'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border ${msg.role === 'model'
                                        ? 'bg-green-600 border-green-400/50 text-white'
                                        : 'bg-white/5 border-white/10'
                                        } ${messages[idx - 1]?.role === msg.role ? 'invisible h-0' : 'visible'}`}>
                                        {msg.role === 'model' ? (
                                            <Bot size={22} className="drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                                        ) : user?.profilePicture ? (
                                            <img
                                                src={user.profilePicture}
                                                alt="User"
                                                className="w-full h-full object-cover rounded-xl"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                                                }}
                                            />
                                        ) : (
                                            <User size={22} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {messages[idx - 1]?.role !== msg.role && (
                                            <div className="text-sm text-zinc-500 font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                                                {msg.role === 'model' ? 'CodeFit AI' : 'You'}
                                                <span className="h-1 w-1 bg-gray-700 rounded-full" />
                                                <span className="text-[10px] lowercase font-medium">Just now</span>
                                            </div>
                                        )}
                                        <div className="prose prose-invert max-w-none text-[15px] leading-relaxed font-medium">
                                            <div className="space-y-4">
                                                {/* Handle Local Attachments */}
                                                {(msg.attachment || (msg.attachments && msg.attachments.length > 0)) && (
                                                    <div className="flex flex-wrap gap-3 mb-4">
                                                        {msg.attachment && (
                                                            <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                                                                {msg.attachment.type.startsWith('image/') ? (
                                                                    <img src={msg.attachment.url} alt="Attachment" className="max-h-72 object-cover" />
                                                                ) : msg.attachment.type.startsWith('audio/') ? (
                                                                    <audio controls src={msg.attachment.url} className="p-2 bg-black/40" />
                                                                ) : (
                                                                    <div className="p-4 bg-white/5 flex items-center gap-2">
                                                                        <Paperclip size={18} className="text-green-500" />
                                                                        <span className="text-sm font-bold">Attachment</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {msg.attachments && msg.attachments.map((att, attIdx) => {
                                                            const fileUrl = `/uploads/${att.filePath.split('\\').pop().split('/').pop()}`;
                                                            return (
                                                                <div key={attIdx} className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                                                                    {att.fileType.startsWith('image/') ? (
                                                                        <img src={fileUrl} alt="Attachment" className="max-h-72 object-cover" />
                                                                    ) : att.fileType.startsWith('audio/') ? (
                                                                        <audio controls src={fileUrl} className="p-2 bg-black/40" />
                                                                    ) : (
                                                                        <div className="p-4 bg-white/5 flex items-center gap-2">
                                                                            <Paperclip size={18} className="text-green-500" />
                                                                            <span className="text-sm font-bold">{att.originalName}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <ReactMarkdown
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            const codeString = String(children).replace(/\n$/, '');
                                                            return !inline && match ? (
                                                                <div className="group relative rounded-2xl overflow-hidden my-6 border border-white/10 shadow-2xl bg-[#0d0e12]">
                                                                    <div className="flex items-center justify-between px-5 py-3 bg-[#1a1b23] border-b border-white/5">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex gap-1.5 mr-2">
                                                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                                                            </div>
                                                                            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">{match[1]}</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(codeString);
                                                                                alert('Copied to clipboard!');
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-white transition-all bg-white/5 px-2 py-1 rounded-md border border-white/10"
                                                                        >
                                                                            <Copy size={12} />
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                    <SyntaxHighlighter
                                                                        {...props}
                                                                        style={vscDarkPlus}
                                                                        language={match[1]}
                                                                        PreTag="div"
                                                                        customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px' }}
                                                                    >
                                                                        {codeString}
                                                                    </SyntaxHighlighter>
                                                                </div>
                                                            ) : (
                                                                <code {...props} className="bg-white/10 px-1.5 py-0.5 rounded-md text-green-400 font-mono text-sm">
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-6 p-8 rounded-3xl bg-white/5 border border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-lg border border-green-400/50">
                                        <Loader2 size={22} className="animate-spin" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500/50 rounded-full typing-dot"></div>
                                        <div className="w-2 h-2 bg-green-500/50 rounded-full typing-dot"></div>
                                        <div className="w-2 h-2 bg-green-500/50 rounded-full typing-dot"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/95 to-transparent pt-10 pb-8 px-4">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Preview Area */}
                        <AnimatePresence>
                            {previewUrl && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute bottom-full left-0 mb-4 flex items-center gap-3 p-2 bg-[#1a1b23] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl"
                                >
                                    <div className="relative group">
                                        {selectedFile?.type.startsWith('image/') ? (
                                            <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-white/10" />
                                        ) : (
                                            <div className="h-20 w-20 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                                <Mic size={24} className="text-red-500 animate-pulse" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={clearAttachment}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 border border-white/20 hover:bg-red-600 transition-colors shadow-lg"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="pr-4">
                                        <p className="text-xs font-bold text-white mb-1 truncate max-w-[150px]">{selectedFile?.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ready to analyze</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSend} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-800 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
                            <div className="relative flex items-end gap-2 bg-[#1a1b23] border border-white/10 shadow-2xl rounded-2xl p-3 focus-within:border-green-500/50 focus-within:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all">
                                {/* File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,audio/*,video/*"
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-green-500 transition-all rounded-xl hover:bg-white/5"
                                    title="Attach file"
                                >
                                    <Paperclip size={22} />
                                </button>

                                {/* Voice Recording */}
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-3 transition-all rounded-xl ${isRecording ? 'text-red-500 recording-active bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-white/5'}`}
                                    title={isRecording ? "Stop recording" : "Record voice"}
                                >
                                    <Mic size={22} />
                                </button>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask for coding logic or fitness advice..."
                                    className="flex-1 max-h-[200px] py-3 px-2 bg-transparent border-none text-white focus:ring-0 focus:outline-none resize-none custom-scrollbar font-medium text-[15px] placeholder:text-gray-600"
                                    rows="1"
                                    style={{ minHeight: '44px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={(!input.trim() && !selectedFile) || loading}
                                    className={`p-3 rounded-xl transition-all duration-300 ${(!input.trim() && !selectedFile) || loading
                                        ? 'bg-transparent text-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-500 shadow-xl shadow-green-900/20 active:scale-95'}`}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </form>
                        <div className="text-center mt-3 text-[10px] text-gray-600 uppercase tracking-[0.2em] hidden md:block">
                            Engineered for engineering excellence.
                        </div>
                    </div>
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default ChatInterface;
