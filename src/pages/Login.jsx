import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/components/LanguageContext';
import { Sparkles, Mail, Lock, User, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
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
                            <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-[#e5b889]'}`} />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-[#fdf6ef] text-[#8f7a6a]'}`}>
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={signInWithGoogle}
                            className={`${darkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-[#b66c34] hover:bg-[#f4d0a8] text-[#b66c34]'}`}
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={signInWithMicrosoft}
                            className={`${darkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-[#b66c34] hover:bg-[#f4d0a8] text-[#b66c34]'}`}
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="#f25022" d="M1 1h10v10H1z"/>
                                <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                                <path fill="#7fba00" d="M13 1h10v10H13z"/>
                                <path fill="#ffb900" d="M13 13h10v10H13z"/>
                            </svg>
                            Microsoft
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
