"use client"

import { MessageSquare, Users, Bot, TrendingUp, Clock, Zap } from "lucide-react"

const stats = [
    {
        label: "Conversas Ativas",
        value: "0",
        change: "+0%",
        icon: MessageSquare,
        gradient: "from-blue-500 to-blue-600",
        glow: "shadow-blue-500/20",
    },
    {
        label: "Contatos",
        value: "0",
        change: "+0%",
        icon: Users,
        gradient: "from-violet-500 to-purple-600",
        glow: "shadow-violet-500/20",
    },
    {
        label: "Agentes IA",
        value: "0",
        change: "Ativos",
        icon: Bot,
        gradient: "from-emerald-500 to-green-600",
        glow: "shadow-emerald-500/20",
    },
    {
        label: "Taxa de Resposta",
        value: "—",
        change: "Tempo médio",
        icon: Clock,
        gradient: "from-amber-500 to-orange-600",
        glow: "shadow-amber-500/20",
    },
]

export default function DashboardPage() {
    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 animate-slide-up">
                <h1 className="text-2xl font-semibold text-white">
                    Bem-vindo ao{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                        NexCRM
                    </span>
                </h1>
                <p className="text-sm text-[#94A3B8] mt-1">
                    Aqui está o resumo da sua operação
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className="glass-card p-5 hover-lift cursor-default group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} group-hover:scale-110 transition-transform duration-200`}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-[#64748B] mt-1">{stat.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                    Ações Rápidas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button className="glass-card p-5 text-left hover-glow hover-lift group transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <MessageSquare className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                            <span className="text-sm font-medium text-white">Nova Conversa</span>
                        </div>
                        <p className="text-xs text-[#64748B]">Inicie um novo atendimento</p>
                    </button>

                    <button className="glass-card p-5 text-left hover-glow hover-lift group transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <Bot className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
                            <span className="text-sm font-medium text-white">Criar Agente IA</span>
                        </div>
                        <p className="text-xs text-[#64748B]">Configure um novo assistente</p>
                    </button>

                    <button className="glass-card p-5 text-left hover-glow hover-lift group transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
                            <span className="text-sm font-medium text-white">Adicionar Contato</span>
                        </div>
                        <p className="text-xs text-[#64748B]">Cadastre um novo contato</p>
                    </button>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
                <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
                    Atividade Recente
                </h2>
                <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-4">
                        <Zap className="w-7 h-7 text-[#64748B]" />
                    </div>
                    <p className="text-sm text-[#94A3B8] mb-1">Nenhuma atividade recente</p>
                    <p className="text-xs text-[#64748B]">
                        As conversas e interações aparecerão aqui
                    </p>
                </div>
            </div>
        </div>
    )
}
