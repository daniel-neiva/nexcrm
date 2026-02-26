"use client"

import { useState, useEffect } from "react"
import { Plus, MoreHorizontal, Bot, Settings, Trash2, Power, Eye, Loader2, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Shared UI Types
type FlowType = "QUALIFICATION" | "SCHEDULING" | "CUSTOM"

interface AIAgent {
    id: string
    name: string
    roleDescription: string
    flow: FlowType
    isActive: boolean
    createdAt: string
}

export default function AIAgentsSettingsPage() {
    const [agents, setAgents] = useState<AIAgent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [debugInfo, setDebugInfo] = useState<any>(null)

    // Fetch Initial Data
    useEffect(() => {
        const getSession = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setDebugInfo({ userId: user?.id, email: user?.email })
        }
        getSession()
        fetchAgents()
    }, [])

    const fetchAgents = async () => {
        try {
            const res = await fetch("/api/agents")
            const data = await res.json()
            if (Array.isArray(data)) setAgents(data)
        } catch (error) {
            console.error("Failed to fetch AI agents", error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
        try {
            // Optimistic UI update
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isActive: !currentStatus } : a))

            // In a real app we would have a PATCH endpoint, doing this hypothetically
            await fetch(`/api/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            })
        } catch (error) {
            console.error(error)
            await fetchAgents() // Revert
        }
    }

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10">
            <div className="max-w-[1000px] mx-auto">
                {/* Header Navbar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 animate-slide-up">
                    <Link href="/settings" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90">Agentes de Inteligência</h1>
                        <p className="text-sm font-medium text-[#94A3B8] mt-1">Configure robôs autônomos para qualificar e atender seus leads 24h por dia</p>
                    </div>
                    <div className="flex-1" />

                    {/* The "Create" flow will redirect to a dedicated complex Wizard page */}
                    <Link href="/settings/ai-agents/create">
                        <button className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300">
                            <Plus className="w-5 h-5" />
                            Novo Agente IA
                        </button>
                    </Link>
                </div>

                {/* Debug Info Overlay */}
                <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-mono text-white/40 break-all stagger-children">
                    <p>DEBUG: Supabase User ID: {debugInfo?.userId || 'N/A'}</p>
                    <p>DEBUG: Email: {debugInfo?.email || 'N/A'}</p>
                    <p>DEBUG: Total Agents Found: {agents.length}</p>
                </div>

                {/* Agents List / Glass Panel */}
                <div className="apple-glass-panel rounded-3xl overflow-hidden animate-slide-up shadow-2xl relative" style={{ animationDelay: "0.1s" }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/40">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                            Carregando assistentes...
                        </div>
                    ) : (
                        <table className="w-full relative z-10">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-black/20">
                                    <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pl-6">Robô</th>
                                    <th className="hidden sm:table-cell text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Função</th>
                                    <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Status</th>
                                    <th className="text-right px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pr-6">Opções</th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children relative divide-y divide-white/[0.04]">
                                {agents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                                <Bot className="w-8 h-8 text-white/20" />
                                            </div>
                                            <h3 className="text-base font-bold text-white/70 mb-1">Nenhum Agente Ativo</h3>
                                            <p className="text-sm font-medium text-[#64748B]">
                                                Crie seu primeiro atendente virtual para automatizar sua operação.
                                            </p>
                                        </td>
                                    </tr>
                                ) : agents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-white/[0.04] transition-colors group">
                                        <td className="px-6 py-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                                                    <Bot className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white/90 group-hover:text-emerald-400 transition-colors">{agent.name}</div>
                                                    <div className="text-xs font-medium text-[#64748B] mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                                                        {agent.roleDescription}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4">
                                            <Badge className="text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider text-white border border-white/10 shadow-sm backdrop-blur-sm bg-white/5">
                                                {agent.flow === 'QUALIFICATION' ? 'Qualificação' : agent.flow}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                                                <span className="text-xs font-bold text-white/70">
                                                    {agent.isActive ? 'Ativo' : 'Desativado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 pr-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 shadow-sm outline-none">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-2xl p-2">
                                                    <DropdownMenuLabel className="text-xs font-bold text-white/40 uppercase tracking-widest px-2 py-1.5">Ações do Agente</DropdownMenuLabel>

                                                    <Link href={`/settings/ai-agents/${agent.id}`}>
                                                        <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-blue-500/20 focus:text-blue-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                            <Settings className="w-4 h-4" /> Configurar / Editar
                                                        </DropdownMenuItem>
                                                    </Link>

                                                    <DropdownMenuItem
                                                        onClick={() => toggleAgentStatus(agent.id, agent.isActive)}
                                                        className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                        <Power className="w-4 h-4" /> {agent.isActive ? 'Pausar Atendimento' : 'Retomar Atendimento'}
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-white/5 my-1" />

                                                    <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-red-500/20 focus:text-red-400 text-red-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                        <Trash2 className="w-4 h-4" /> Excluir Robô
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
