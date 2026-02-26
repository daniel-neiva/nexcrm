"use client"

import { Settings, User, Users, Tag, Webhook, Bot, Zap, Keyboard, MessageSquare, ChevronRight } from "lucide-react"
import Link from "next/link"

const settingSections = [
    { label: "Conta", description: "Nome, telefone, idioma, assinatura", icon: Settings, href: "/settings/account" },
    { label: "Atendentes", description: "Gerencie sua equipe de atendimento", icon: User, href: "/settings/agents" },
    { label: "Times", description: "Organize atendentes em departamentos", icon: Users, href: "/settings/teams" },
    { label: "Etiquetas", description: "Crie e gerencie etiquetas coloridas", icon: Tag, href: "/settings/labels" },
    { label: "Automação", description: "Regras de automação e triggers", icon: Zap, href: "/settings/automation" },
    { label: "Atalhos", description: "Respostas prontas com \"/\"", icon: Keyboard, href: "/settings/shortcuts" },
    { label: "WhatsApp", description: "Configurações da Evolution API", icon: MessageSquare, href: "/settings/whatsapp" },
    { label: "Agentes IA", description: "Configure robôs inteligentes", icon: Bot, href: "/settings/ai-agents" },
    { label: "Integrações", description: "Webhooks, Google Agenda e mais", icon: Webhook, href: "/settings/integrations" },
]

export default function SettingsPage() {
    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10">
            <div className="max-w-[1000px] mx-auto">
                {/* Header */}
                <div className="mb-10 animate-slide-up">
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Configurações</h1>
                    <p className="text-sm font-medium text-[#94A3B8] mt-2">Gerencie e customize a infraestrutura do seu CRM</p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 stagger-children">
                    {settingSections.map((section) => {
                        const Icon = section.icon
                        return (
                            <Link
                                key={section.label}
                                href={section.href}
                                className="apple-glass-panel p-6 rounded-3xl group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/10 relative overflow-hidden flex items-center justify-between"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                                <div className="flex items-center gap-5 relative z-10 w-full">
                                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-violet-500/30 transition-all border border-white/10 shadow-inner group-hover:scale-110 duration-300">
                                        <Icon className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-white/90 mb-0.5 group-hover:text-white transition-colors">{section.label}</h3>
                                        <p className="text-sm font-medium text-[#64748B] pr-4">{section.description}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* System Stats / Footer Info */}
                <div className="mt-12 pt-8 border-t border-white/10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <p className="text-xs text-[#64748B] text-center font-medium">
                        NexCRM v1.5.0 • Licenciado para Daniel Comercial
                    </p>
                </div>
            </div>
        </div>
    )
}
