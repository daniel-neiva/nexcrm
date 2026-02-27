"use client"

import { useState, useEffect } from "react"
import { Plus, Bot, Pencil, Copy, Trash2, Sparkles, Loader2, Power, Settings, MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AIAgent {
    id: string
    name: string
    roleDescription: string
    flow: string
    isActive: boolean
    voiceType?: string
    personality?: string
    prompt?: string
    createdAt: string
}

export default function AgentsPage() {
    const router = useRouter()
    const [agents, setAgents] = useState<AIAgent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
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

    const handleDeleteAgent = async (agentId: string) => {
        if (!confirm("Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.")) return

        try {
            setAgents(prev => prev.filter(a => a.id !== agentId))
            await fetch(`/api/agents/${agentId}`, { method: "DELETE" })
        } catch (error) {
            console.error(error)
            await fetchAgents()
        }
    }

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-slide-up">
                <div>
                    <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                        <Bot className="w-6 h-6 text-blue-400" />
                        Agentes IA
                    </h1>
                    <p className="text-sm text-[#94A3B8] mt-1">
                        Gerencie seus agentes de IA para atendimento ao cliente
                    </p>
                </div>
                <Link href="/settings/ai-agents/create">
                    <button className="btn-gradient px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Criar Agente
                    </button>
                </Link>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    Carregando assistentes...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="glass-card p-5 hover-lift group transition-all duration-300 relative"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${agent.isActive ? "from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20" : "from-gray-600 to-gray-700"} flex items-center justify-center transition-shadow group-hover:shadow-blue-500/30`}>
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-semibold text-white truncate">{agent.name}</h3>
                                        <p className="text-[11px] text-[#64748B]">{agent.voiceType === 'FEMALE' ? 'Feminino' : 'Masculino'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={`text-[10px] border-0 shrink-0 ${agent.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
                                        {agent.isActive ? "Ativo" : "Inativo"}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-2xl p-2">
                                            <DropdownMenuLabel className="text-xs font-bold text-white/40 uppercase tracking-widest px-2 py-1.5">Opções</DropdownMenuLabel>

                                            <Link href={`/settings/ai-agents/${agent.id}`}>
                                                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-blue-500/20 focus:text-blue-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                    <Settings className="w-4 h-4" /> Configurar
                                                </DropdownMenuItem>
                                            </Link>

                                            <DropdownMenuItem
                                                onClick={() => toggleAgentStatus(agent.id, agent.isActive)}
                                                className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                <Power className="w-4 h-4" /> {agent.isActive ? 'Pausar' : 'Ativar'}
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator className="bg-white/5 my-1" />

                                            <DropdownMenuItem
                                                onClick={() => handleDeleteAgent(agent.id)}
                                                className="gap-2 cursor-pointer focus:bg-red-500/20 focus:text-red-400 text-red-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                <Trash2 className="w-4 h-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Prompt Preview */}
                            <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4 leading-relaxed h-[36px]">
                                {agent.roleDescription || agent.prompt || "Sem descrição definida."}
                            </p>

                            {/* Tags */}
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/20">
                                    {agent.flow === 'QUALIFICATION' ? 'Qualificação' : agent.flow || 'Geral'}
                                </Badge>
                                {agent.personality && (
                                    <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/20">
                                        {agent.personality}
                                    </Badge>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                <Link href={`/settings/ai-agents/${agent.id}`} className="flex-1">
                                    <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
                                        <Pencil className="w-3.5 h-3.5" />
                                        Editar
                                    </button>
                                </Link>
                                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
                                    <Copy className="w-3.5 h-3.5" />
                                    Duplicar
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Create Agent Card */}
                    <Link href="/settings/ai-agents/create">
                        <button className="glass-card p-5 flex flex-col items-center justify-center text-center w-full min-h-[200px] border-dashed border-white/10 hover:border-blue-500/30 hover-glow transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-3 group-hover:from-blue-500/20 group-hover:to-violet-500/20 transition-all">
                                <Sparkles className="w-7 h-7 text-blue-400 group-hover:text-blue-300" />
                            </div>
                            <p className="text-sm font-medium text-white mb-1">Criar Novo Agente</p>
                            <p className="text-xs text-[#64748B]">Configure um assistente virtual</p>
                        </button>
                    </Link>

                    {agents.length === 0 && !isLoading && (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                <Bot className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="text-lg font-bold text-white/50">Nenhum agente encontrado</h3>
                            <p className="text-sm text-[#64748B] mt-1">Crie seu primeiro agente para começar.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
