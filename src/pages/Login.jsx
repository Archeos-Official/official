import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/components/LanguageContext';
import { Sparkles, Mail, Lock, User, ArrowLeft, LogIn, UserPlus, Chrome, Mailbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
    const { signIn, signUp, signInWithGoogle, signInWithMicrosoft } = useAuth();
    const { t, darkMode } = useLanguage();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isSignUp) {
                const result = await signUp({ email, password, fullName });
                if (result.error) {
                    setError(result.error.message);
                } else {
                    setSuccess('Account created! Check your email to confirm.');
                }
            } else {
                const result = await signIn({ email, password });
                if (result.error) {
                    setError(result.error.message);
                } else {
                    window.location.href = '/';
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <Card className={`w-full max-w-md p-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-[#f4d0a8]' : 'bg-[#b66c34]'}`}>
                        <Sparkles className={`w-8 h-8 ${darkMode ? 'text-gray-900' : 'text-white'}`} />
                    </div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                        ArcheOS
                    </h1>
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                        {isSignUp ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="relative">
                            <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-[#8f7a6a]'}`} />
                            <Input
                                type="text"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className={`pl-10 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-[#8f7a6a]'}`} />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`pl-10 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        />
                    </div>

                    <div className="relative">
                        <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-[#8f7a6a]'}`} />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className={`pl-10 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}

                    {success && (
                        <p className="text-green-500 text-sm text-center">{success}</p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-[#b66c34] hover:bg-[#8f5428] text-white`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isSignUp ? 'Creating account...' : 'Signing in...'}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                {isSignUp ? <><UserPlus className="w-4 h-4" /> Create Account</> : <><LogIn className="w-4 h-4" /> Sign In</>}
                            </span>
                        )}
                    </Button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-[#e5b889]'}`}></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-[#fdf6ef] text-[#8f7a6a]'}`}>Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => signInWithGoogle()}
                            disabled={loading}
                            className={`${darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-[#e5b889] text-[#6b5344] hover:bg-[#fdf6ef]'}`}
                        >
                            <Chrome className="w-4 h-4 mr-2" />
                            Google
                        </Button>
                        
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                            setSuccess('');
                        }}
                        className={`text-sm ${darkMode ? 'text-[#f4d0a8] hover:underline' : 'text-[#b66c34] hover:underline'}`}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 text-center">
                    <Link
                        to="/"
                        className={`text-sm flex items-center justify-center gap-2 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-[#8f7a6a] hover:text-[#6b5344]'}`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </Card>
        </div>
    );
}
