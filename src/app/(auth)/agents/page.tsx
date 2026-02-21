"use client"

import { Plus, Bot, Pencil, Copy, Trash2, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const agents = [
    {
        id: "1",
        name: "Assistente Geral",
        voiceType: "Feminino",
        prompt: "Você é um assistente de atendimento ao cliente. Seja cordial, prestativo e eficiente...",
        flow: "Qualificação",
        personality: "Consultivo",
        isActive: true,
    },
    {
        id: "2",
        name: "Vendas AI",
        voiceType: "Masculino",
        prompt: "Você é um especialista em vendas. Identifique necessidades do cliente e sugira soluções...",
        flow: "Vendas",
        personality: "Persuasivo",
        isActive: true,
    },
    {
        id: "3",
        name: "Suporte Técnico",
        voiceType: "Feminino",
        prompt: "Você é um agente de suporte técnico. Resolva problemas de forma clara e objetiva...",
        flow: "Suporte",
        personality: "Técnico",
        isActive: false,
    },
]

export default function AgentsPage() {
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
                <button className="btn-gradient px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Agente
                </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
                {agents.map((agent) => (
                    <div
                        key={agent.id}
                        className="glass-card p-5 hover-lift group transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${agent.isActive ? "from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20" : "from-gray-600 to-gray-700"} flex items-center justify-center transition-shadow group-hover:shadow-blue-500/30`}>
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                                    <p className="text-[11px] text-[#64748B]">{agent.voiceType}</p>
                                </div>
                            </div>
                            <Badge className={`text-[10px] border-0 ${agent.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
                                {agent.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>

                        {/* Prompt Preview */}
                        <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4 leading-relaxed">
                            {agent.prompt}
                        </p>

                        {/* Tags */}
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/20">
                                {agent.flow}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/20">
                                {agent.personality}
                            </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 pt-3 border-t border-white/5">
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
                                <Copy className="w-3.5 h-3.5" />
                                Duplicar
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}

                {/* Create Agent Card */}
                <button className="glass-card p-5 flex flex-col items-center justify-center text-center min-h-[220px] border-dashed border-white/10 hover:border-blue-500/30 hover-glow transition-all duration-300 group">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-3 group-hover:from-blue-500/20 group-hover:to-violet-500/20 transition-all">
                        <Sparkles className="w-7 h-7 text-blue-400 group-hover:text-blue-300" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Criar Novo Agente</p>
                    <p className="text-xs text-[#64748B]">Configure um assistente virtual</p>
                </button>
            </div>
        </div>
    )
}
