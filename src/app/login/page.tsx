/**
 * ============================================================================
 * Proyecto CamBus V3 - Sistema de Control Logístico y LPR
 * Desarrollado por: Eric Emmanuel (GitHub: ericemmanu-a11y)
 * Propiedad Intelectual y Licencia de Uso Exclusivo
 * ============================================================================
 */
'use client';

import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });

            const data = await res.json();

            if (data.success) {
                // Next.js middleware will handle the redirect immediately or we push
                router.push('/');
                router.refresh();
            } else {
                setError(data.error || 'Credenciales inválidas');
            }
        } catch (err) {
            setError('Error de conexión al servidor de autenticación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden relative font-sans text-slate-100">
            {/* Background Decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-700 rounded-3xl mb-6 shadow-2xl w-36 h-36 overflow-hidden shadow-blue-500/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="CamBus Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">CamBus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400"> Logistics</span></h1>
                    <p className="text-slate-400 text-sm font-semibold">Autenticación Segura IoT</p>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Correo Corporativo</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Mail className="w-5 h-5" />
                                </span>
                                <input
                                    type="email"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                    placeholder="operador@mabe.com"
                                    required
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña (Hash pgcrypto)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-12 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors duration-200 shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Ingresar a la Consola</>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 flex justify-center items-center gap-2 text-xs text-slate-500">
                    <Database className="w-4 h-4" /> PostgreSQL Secure Backend
                </div>
            </div>
        </div>
    );
}
