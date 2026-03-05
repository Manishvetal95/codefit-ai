import { useState, useRef, useEffect } from 'react';
import { X, Settings, Loader2, Lock, User, Camera, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile'); // Default to profile for better UX
    const fileInputRef = useRef(null);

    // Profile State
    const [username, setUsername] = useState(user?.username || '');
    const [profileImg, setProfileImg] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || null);

    // Password Change State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Sync state when user data changes (e.g. after update or load)
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setPreviewUrl(user.profilePicture || null);
        }
    }, [user, isOpen]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImg(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('username', username);
            if (profileImg) {
                formData.append('profilePicture', profileImg);
            }

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await axios.put('/api/auth/profile', formData, config);

            updateUser(data);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            await axios.put('/api/auth/update-password', {
                userId: user._id,
                oldPassword,
                newPassword
            }, config);

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setOldPassword('');
            setNewPassword('');

        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update password'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#202123] border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-auto max-h-[85vh] relative z-[10000]"
                >
                    {/* Unified Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#202123] shrink-0">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <Settings size={20} />
                            Settings
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Body (Flex Row on Desktop, Col on Mobile) */}
                    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                        {/* Sidebar / Tabs */}
                        <div className="w-full md:w-64 bg-[#17181A] border-b md:border-b-0 md:border-r border-white/10 p-4 flex flex-col shrink-0">
                            <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                                <button
                                    onClick={() => { setActiveTab('profile'); setMessage({ type: '', text: '' }); }}
                                    className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 md:px-4 py-2 md:py-3 rounded-full md:rounded-lg transition-all text-sm whitespace-nowrap border-2 md:border-0 md:border-l-4
                                        ${activeTab === 'profile'
                                            ? 'bg-green-600/10 text-green-500 border-green-500/50 md:bg-white/5 md:text-white md:border-l-green-500'
                                            : 'bg-[#2A2B32] text-gray-400 border-transparent md:bg-transparent md:hover:text-white md:hover:bg-white/5 md:border-l-transparent'
                                        }`}
                                >
                                    <User size={18} className={activeTab === 'profile' ? 'text-green-500' : ''} />
                                    Profile
                                </button>

                                <button
                                    onClick={() => { setActiveTab('password'); setMessage({ type: '', text: '' }); }}
                                    className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 md:px-4 py-2 md:py-3 rounded-full md:rounded-lg transition-all text-sm whitespace-nowrap border-2 md:border-0 md:border-l-4
                                        ${activeTab === 'password'
                                            ? 'bg-green-600/10 text-green-500 border-green-500/50 md:bg-white/5 md:text-white md:border-l-green-500'
                                            : 'bg-[#2A2B32] text-gray-400 border-transparent md:bg-transparent md:hover:text-white md:hover:bg-white/5 md:border-l-transparent'
                                        }`}
                                >
                                    <Lock size={18} className={activeTab === 'password' ? 'text-green-500' : ''} />
                                    Security
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col min-h-0 bg-[#202123]">
                            <div className="hidden md:flex items-center justify-between p-6 border-b border-white/5">
                                <h4 className="text-lg font-medium text-gray-200">
                                    {activeTab === 'profile' ? 'Profile Settings' : 'Security Settings'}
                                </h4>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {message.text && (
                                    <div className={`mb-6 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {message.text}
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <div className="max-w-md">
                                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                                            {/* Profile Picture Upload */}
                                            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-6 pb-6 border-b border-white/5">
                                                <div className="relative group">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-[#2A2B32] flex items-center justify-center relative">
                                                        {previewUrl ? (
                                                            <img
                                                                src={previewUrl}
                                                                alt="Preview"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    console.log('Image load error:', previewUrl);
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-3xl font-bold text-gray-500 uppercase">{user?.username?.charAt(0)}</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current.click()}
                                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Camera size={24} className="text-white" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                        accept="image/*"
                                                    />
                                                </div>
                                                <div className="flex-1 text-center sm:text-left">
                                                    <h5 className="text-white font-medium mb-1">Profile Photo</h5>
                                                    <p className="text-xs text-gray-500 mb-3">Upload a new profile picture. JPG or PNG, max 5MB.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current.click()}
                                                        className="px-4 py-1.5 bg-[#2A2B32] hover:bg-white/10 text-white text-xs font-semibold rounded-md transition-all border border-white/10"
                                                    >
                                                        Upload New
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Username Field */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Username</label>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full bg-[#2A2B32] border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500 shadow-sm"
                                                    placeholder="Enter username"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Email</label>
                                                <input
                                                    type="email"
                                                    value={user?.email}
                                                    disabled
                                                    className="w-full bg-[#17181A] border border-white/5 rounded-lg p-3 text-gray-500 cursor-not-allowed text-sm"
                                                />
                                                <p className="text-[10px] text-gray-500 mt-1">Email cannot be changed</p>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full md:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 text-sm font-semibold transform active:scale-[0.98]"
                                                >
                                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {activeTab === 'password' && (
                                    <div className="max-w-md">
                                        <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-white/10">Change Password</h5>

                                        <form onSubmit={handlePasswordSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Current Password</label>
                                                <div className="relative group">
                                                    <input
                                                        type="password"
                                                        value={oldPassword}
                                                        onChange={(e) => setOldPassword(e.target.value)}
                                                        className="w-full bg-[#2A2B32] border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500 shadow-sm"
                                                        placeholder="Enter current password"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">New Password</label>
                                                <div className="relative group">
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full bg-[#2A2B32] border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500 shadow-sm"
                                                        placeholder="Enter new password"
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full md:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 text-sm font-semibold transform active:scale-[0.98]"
                                                >
                                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SettingsModal;
