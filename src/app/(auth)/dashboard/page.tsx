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
                <h1 className="text-3xl font-bold tracking-tight text-white/90">
                    Bem-vindo ao{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                        NexCRM
                    </span>
                </h1>
                <p className="text-sm font-medium text-white/50 mt-1">
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
                            className="glass-card p-6 flex flex-col justify-between hover-lift cursor-default group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div
                                    className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} border border-white/20 group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-semibold tracking-wide text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    {stat.change}
                                </span>
                            </div>
                            <div className="relative z-10 mt-auto">
                                <p className="text-3xl font-bold tracking-tight text-white/95">{stat.value}</p>
                                <p className="text-xs font-medium text-white/50 mt-1 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                    Ações Rápidas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button className="apple-glass-panel rounded-3xl p-6 text-left hover-glow hover-lift group border border-white/10 transition-all duration-300 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-sm font-semibold text-white/90">Nova Conversa</span>
                        </div>
                        <p className="text-xs font-medium text-white/50 mt-auto">Inicie um novo atendimento</p>
                    </button>

                    <button className="apple-glass-panel rounded-3xl p-6 text-left hover-glow hover-lift group border border-white/10 transition-all duration-300 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors">
                                <Bot className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-sm font-semibold text-white/90">Criar Agente IA</span>
                        </div>
                        <p className="text-xs font-medium text-white/50 mt-auto">Configure um novo assistente</p>
                    </button>

                    <button className="apple-glass-panel rounded-3xl p-6 text-left hover-glow hover-lift group border border-white/10 transition-all duration-300 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-sm font-semibold text-white/90">Adicionar Contato</span>
                        </div>
                        <p className="text-xs font-medium text-white/50 mt-auto">Cadastre um novo contato</p>
                    </button>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                    Atividade Recente
                </h2>
                <div className="apple-glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 shadow-inner">
                        <Zap className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-sm font-semibold text-white/70 mb-1">Nenhuma atividade recente</p>
                    <p className="text-xs font-medium text-white/40">
                        As conversas e interações aparecerão aqui nesta área.
                    </p>
                </div>
            </div>
        </div>
    )
}
