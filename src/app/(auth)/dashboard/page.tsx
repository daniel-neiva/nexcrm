"use client"

import { useState, useEffect } from "react"
import {
    MessageSquare, Users, Bot, TrendingUp, Clock, Zap,
    ArrowRight, Loader2, Phone, Tag, Kanban, BarChart3
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface DashboardStats {
    totalConversations: number
    openConversations: number
    totalContacts: number
    activeAgents: number
    totalAgents: number
    todayMessages: number
    last7DaysMessages: number
    aiResponseRate: number
    todayNewContacts: number
}

interface PipelineStage {
    id: string
    name: string
    color: string
    count: number
}

interface RecentActivity {
    id: string
    contactName: string
    contactPhone: string
    contactAvatar: string | null
    agentName: string | null
    status: string
    aiEnabled: boolean
    lastMessage: string
    lastMessageFromMe: boolean
    lastMessageAt: string
    labels: { name: string; color: string }[]
}

function timeAgo(date: string) {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMs / 3600000)
    const days = Math.floor(diffMs / 86400000)
    if (mins < 1) return "agora"
    if (mins < 60) return `${mins}min`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function getInitials(name: string) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [pipeline, setPipeline] = useState<PipelineStage[]>([])
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch("/api/dashboard")
            .then(r => r.json())
            .then(data => {
                if (data.stats) setStats(data.stats)
                if (data.pipeline) setPipeline(data.pipeline)
                if (data.recentActivity) setRecentActivity(data.recentActivity)
            })
            .catch(console.error)
            .finally(() => setIsLoading(false))
    }, [])

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm text-white/40 font-medium">Carregando dashboard...</span>
                </div>
            </div>
        )
    }

    const statCards = [
        {
            label: "Conversas Ativas",
            value: stats?.openConversations ?? 0,
            sub: `${stats?.totalConversations ?? 0} total`,
            icon: MessageSquare,
            gradient: "from-blue-500 to-blue-600",
            glow: "shadow-blue-500/20",
            href: "/chat"
        },
        {
            label: "Contatos",
            value: stats?.totalContacts ?? 0,
            sub: stats?.todayNewContacts ? `+${stats.todayNewContacts} hoje` : "Total",
            icon: Users,
            gradient: "from-violet-500 to-purple-600",
            glow: "shadow-violet-500/20",
            href: "/contacts"
        },
        {
            label: "Agentes IA",
            value: stats?.activeAgents ?? 0,
            sub: `${stats?.totalAgents ?? 0} total`,
            icon: Bot,
            gradient: "from-emerald-500 to-green-600",
            glow: "shadow-emerald-500/20",
            href: "/agents"
        },
        {
            label: "Taxa IA",
            value: `${stats?.aiResponseRate ?? 0}%`,
            sub: "Respostas automáticas",
            icon: Zap,
            gradient: "from-amber-500 to-orange-600",
            glow: "shadow-amber-500/20",
            href: "#"
        },
    ]

    const totalPipelineLeads = pipeline.reduce((acc, s) => acc + s.count, 0)

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
                    Aqui está o resumo da sua operação •{" "}
                    <span className="text-white/40">{stats?.todayMessages ?? 0} mensagens hoje</span>
                    {" "}•{" "}
                    <span className="text-white/40">{stats?.last7DaysMessages ?? 0} nos últimos 7 dias</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="glass-card p-6 flex flex-col justify-between hover-lift group relative overflow-hidden cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div
                                    className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} border border-white/20 group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-semibold tracking-wide text-white/50 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                                    {stat.sub}
                                </span>
                            </div>
                            <div className="relative z-10 mt-auto">
                                <p className="text-3xl font-bold tracking-tight text-white/95">{stat.value}</p>
                                <p className="text-xs font-medium text-white/50 mt-1 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Pipeline Overview */}
                <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Pipeline</h2>
                        <Link href="/pipeline" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                            Ver Kanban <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="apple-glass-panel rounded-2xl p-5 space-y-3">
                        {pipeline.length === 0 ? (
                            <p className="text-sm text-white/30 text-center py-4">Nenhum estágio criado</p>
                        ) : (
                            <>
                                {pipeline.map(stage => {
                                    const percent = totalPipelineLeads > 0 ? (stage.count / totalPipelineLeads) * 100 : 0
                                    return (
                                        <div key={stage.id}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                                    <span className="text-xs font-semibold text-white/70">{stage.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-white/50">{stage.count}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: stage.color }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total</span>
                                    <span className="text-sm font-bold text-white/60">{totalPipelineLeads} leads</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Atividade Recente</h2>
                        <Link href="/chat" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                            Abrir Chat <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="apple-glass-panel rounded-2xl overflow-hidden">
                        {recentActivity.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                    <Zap className="w-7 h-7 text-white/20" />
                                </div>
                                <p className="text-sm text-white/50">Nenhuma atividade recente</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {recentActivity.map((item) => (
                                    <Link
                                        key={item.id}
                                        href="/chat"
                                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/10 shrink-0">
                                            {item.contactAvatar ? (
                                                <img src={item.contactAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <span className="text-[11px] font-bold text-white/80">{getInitials(item.contactName)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-semibold text-white/85 truncate">{item.contactName}</span>
                                                {item.labels.map((l, i) => (
                                                    <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${l.color}20`, color: l.color }}>
                                                        {l.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-white/40 truncate">
                                                {item.lastMessageFromMe ? "Você: " : ""}{item.lastMessage}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[10px] text-white/30 font-medium">{timeAgo(item.lastMessageAt)}</span>
                                            {item.agentName && (
                                                <span className="text-[9px] font-bold text-blue-400/60 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Bot className="w-2.5 h-2.5" />
                                                    {item.agentName}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                    Ações Rápidas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link href="/chat" className="apple-glass-panel rounded-2xl p-5 text-left hover-lift group border border-white/10 transition-all duration-300 flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors shrink-0">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-white/90 block">Abrir Chat</span>
                            <span className="text-[11px] text-white/40">Ver conversas</span>
                        </div>
                    </Link>
                    <Link href="/pipeline" className="apple-glass-panel rounded-2xl p-5 text-left hover-lift group border border-white/10 transition-all duration-300 flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors shrink-0">
                            <Kanban className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-white/90 block">Pipeline</span>
                            <span className="text-[11px] text-white/40">Kanban de leads</span>
                        </div>
                    </Link>
                    <Link href="/settings/ai-agents/create" className="apple-glass-panel rounded-2xl p-5 text-left hover-lift group border border-white/10 transition-all duration-300 flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                            <Bot className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-white/90 block">Criar Agente IA</span>
                            <span className="text-[11px] text-white/40">Novo assistente</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
