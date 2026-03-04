/**
 * ============================================================================
 * Proyecto CamBus V3 - Sistema de Control Logístico y LPR
 * Desarrollado por: Eric Emmanuel (GitHub: ericemmanu-a11y)
 * Propiedad Intelectual y Licencia de Uso Exclusivo
 * ============================================================================
 */
'use client';

import { useEffect, useState } from 'react';
import { Truck, Plus, ArrowRight, ArrowLeft, History, ShieldAlert, Pencil, Trash2 } from 'lucide-react';

interface VehiculoRow {
    id_registro: number;
    placa: string;
    numero_anden: number;
    evento: string;
    fecha_hora_entrada: string;
    fecha_hora_salida?: string;
    confianza_placa: string;
    nombre_camara: string;
}

export default function VehiculosPage() {
    const [registros, setRegistros] = useState<VehiculoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [andenesDisponibles, setAndenesDisponibles] = useState<number[]>([]); // Se cargará dinámicamente desde la BD

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id_registro: 0,
        placa: '',
        id_anden: 1,
        evento: 'entrada'
    });

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            });

        fetch('/api/dashboard')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data.andenes) {
                    setAndenesDisponibles(data.data.andenes.map((a: any) => a.id_anden).sort((a: number, b: number) => a - b));
                }
            });

        fetchRegistros();
    }, []);

    const fetchRegistros = async () => {
        try {
            const res = await fetch('/api/vehiculos');
            const json = await res.json();
            if (json.success) {
                setRegistros(json.data);
            }
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        const fallbackAnden = andenesDisponibles.length > 0 ? andenesDisponibles[0] : 1;
        setFormData({ id_registro: 0, placa: '', id_anden: fallbackAnden, evento: 'entrada' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (reg: VehiculoRow) => {
        setFormData({
            id_registro: reg.id_registro,
            placa: reg.placa,
            id_anden: reg.numero_anden || 1,
            evento: reg.evento
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este registro histórico? Esta acción afectará la trazabilidad del patio.')) return;

        try {
            const res = await fetch(`/api/vehiculos?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchRegistros();
            } else {
                alert(json.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error de red al eliminar');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/vehiculos';
            const method = isEditing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const json = await res.json();
            if (json.success) {
                setShowModal(false);
                fetchRegistros();
            } else {
                alert(json.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error de red');
        }
    };

    const getEventIcon = (evento: string) => {
        if (evento === 'entrada') return <ArrowRight className="w-4 h-4 text-emerald-400" />;
        return <ArrowLeft className="w-4 h-4 text-rose-400" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Operador no puede ver esta pantalla por roles:
    if (user && user.rol === 'operador') {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
                <ShieldAlert className="w-20 h-20 text-rose-500 mb-4" />
                <h1 className="text-3xl font-bold text-slate-100">Acceso Restringido</h1>
                <p className="text-slate-400">Los operadores no tienen permiso para visualizar o editar registros históricos.</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <Truck className="w-8 h-8 text-blue-400" />
                        Registro de <span className="text-blue-400">Flujo de Vehículos</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-md">
                        Gestión concurrente, edición y registro de vehículos en patio activo.
                    </p>
                </div>

                {(user?.rol === 'admin' || user?.rol === 'supervisor') && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        Registrar Manualmente
                    </button>
                )}
            </div>

            {/* Histórico DataTable */}
            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-slate-700/50 bg-slate-800/20 flex items-center gap-2">
                    <Truck className="text-slate-400 w-5 h-5" />
                    <h3 className="font-semibold text-slate-200">Vehículos Concurrentes Registrados</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900/60 text-xs uppercase font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Placa / Vehículo</th>
                                <th className="px-6 py-4">Evento</th>
                                <th className="px-6 py-4">Andén</th>
                                <th className="px-6 py-4">Cámara Origen</th>
                                <th className="px-6 py-4">Fecha y Hora</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {registros.map((row) => (
                                <tr key={`${row.id_registro}-${row.evento}`} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-200">{row.placa}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${row.evento === 'entrada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                            {getEventIcon(row.evento)}
                                            {row.evento.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-blue-400">{row.numero_anden}</td>
                                    <td className="px-6 py-4 text-slate-400">{row.nombre_camara}</td>
                                    <td className="px-6 py-4 text-xs font-mono">
                                        {new Date(row.fecha_hora_entrada).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEditModal(row)} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800/50 rounded-lg hover:bg-blue-500/10 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(row.id_registro)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800/50 rounded-lg hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {registros.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500">No hay registros disponibles.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Registro/Edición Manual */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6 text-slate-100 flex items-center gap-2">
                            <Truck className="w-6 h-6 text-blue-400" />
                            {isEditing ? 'Editar Registro' : 'Entrada/Salida Manual'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Placa del Vehículo</label>
                                <input required type="text" placeholder="Ej. ABC-123-X"
                                    value={formData.placa} onChange={e => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 uppercase font-black tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Andén Asignado</label>
                                    <select
                                        value={formData.id_anden}
                                        onChange={e => setFormData({ ...formData, id_anden: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                                    >
                                        {andenesDisponibles.map(num => <option key={num} value={num}>Andén {num}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Evento</label>
                                    <select
                                        value={formData.evento}
                                        onChange={e => setFormData({ ...formData, evento: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="entrada">ENTRADA</option>
                                        <option value="salida">SALIDA (Cierre)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
