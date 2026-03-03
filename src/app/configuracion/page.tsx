'use client';

import { useEffect, useState } from 'react';
import { Settings, ShieldAlert, MonitorPlay, Power, ServerCog } from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracionPage() {
    const [user, setUser] = useState<any>(null);
    const [daemonRunning, setDaemonRunning] = useState(false);
    const [isLoadingToggle, setIsLoadingToggle] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            });

        // Check current Daemon Status
        checkDaemonStatus();
    }, []);

    const checkDaemonStatus = async () => {
        try {
            const res = await fetch('/api/daemon', { method: 'GET' });
            const data = await res.json();
            if (data.success) {
                setDaemonRunning(data.isRunning);
            }
        } catch (error) {
            console.error('Error fetching daemon status:', error);
        }
    };

    const toggleDaemon = async () => {
        setIsLoadingToggle(true);
        try {
            const action = daemonRunning ? 'stop' : 'start';
            const res = await fetch('/api/daemon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                setDaemonRunning(data.isRunning);
            } else {
                alert('No se pudo cambiar el estado del servicio: ' + data.error);
            }
        } catch (error) {
            console.error('Error toggling daemon:', error);
            alert('Error de red al contactar al servidor maestro.');
        } finally {
            setIsLoadingToggle(false);
        }
    };

    // Operador no puede ver esta pantalla
    if (user && user.rol === 'operador') {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
                <ShieldAlert className="w-20 h-20 text-rose-500 mb-4" />
                <h1 className="text-3xl font-bold text-slate-100">Acceso Restringido</h1>
                <p className="text-slate-400">Los operadores no tienen permiso para modificar la configuración global.</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-400" />
                        Configuración <span className="text-blue-400">Avanzada</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-md">
                        Control de servicios críticos y módulos de sistema.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                {/* Control del Simulador Daemon */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                <ServerCog className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">Servicio LPR (Daemon)</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">
                            Controla si el Simulador Logístico Predictivo está corriendo en segundo plano alimentando la base de datos automáticamente con eventos.
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                        <span className="font-mono text-sm uppercase tracking-wider font-bold">
                            Estado: <span className={daemonRunning ? 'text-emerald-400' : 'text-slate-500'}>
                                {daemonRunning ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </span>

                        <button
                            onClick={toggleDaemon}
                            disabled={isLoadingToggle}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg ${isLoadingToggle ? 'opacity-50 cursor-not-allowed bg-slate-700' :
                                    daemonRunning
                                        ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 text-white'
                                }`}
                        >
                            <Power className="w-5 h-5" />
                            {isLoadingToggle ? 'Espere...' : (daemonRunning ? 'Apagar Motor' : 'Encender Motor')}
                        </button>
                    </div>
                </div>

                {/* Acceso a GUI de Testing */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <MonitorPlay className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">Terminal de Testing (Simulador)</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">
                            Accede a la interfaz visual de pruebas de inyección directa de placas vehiculares para validar la concurrencia del sistema y conexiones API.
                        </p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-end">
                        <Link href="/simulador" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
                            Abrir Terminal
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
