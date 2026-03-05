import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.jpg';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [inputs, setInputs] = useState({ username: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        let res;
        if (isLogin) {
            res = await login(inputs.email, inputs.password);
        } else {
            res = await register(inputs.username, inputs.email, inputs.password);
        }

        if (res.success) {
            navigate('/');
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-[#202123] to-gray-900 animate-gradient font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[#202123]/80 backdrop-blur-xl w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/10"
            >
                <div className="flex justify-center mb-6">
                    <img src={logo} alt="CodeFit AI Logo" className="h-16 w-auto rounded-full" />
                </div>
                <h2 className="text-xl font-semibold text-center mb-6 text-gray-200">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                overflow="hidden"
                            >
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={inputs.username}
                                    onChange={handleChange}
                                    className="w-full bg-[#343541]/50 border border-gray-600/50 rounded-lg p-3 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-gray-600"
                                    placeholder="johndoe"
                                    required
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email address</label>
                        <input
                            type="email"
                            name="email"
                            value={inputs.email}
                            onChange={handleChange}
                            className="w-full bg-[#343541]/50 border border-gray-600/50 rounded-lg p-3 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-gray-600"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={inputs.password}
                                onChange={handleChange}
                                className="w-full bg-[#343541]/50 border border-gray-600/50 rounded-lg p-3 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-gray-600 pr-10"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3.5 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-lg shadow-green-900/20"
                    >
                        {isLogin ? 'Log in' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-green-500 hover:text-green-400 font-bold ml-1 hover:underline transition-colors"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
