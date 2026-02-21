"use client"

import { Settings, User, Users, Tag, Webhook, Bot, Zap, Keyboard, MessageSquare } from "lucide-react"
import Link from "next/link"

const settingSections = [
    { label: "Conta", description: "Nome, telefone, idioma, assinatura", icon: Settings, href: "/settings" },
    { label: "Atendentes", description: "Gerencie sua equipe de atendimento", icon: User, href: "/settings/agents" },
    { label: "Times", description: "Organize atendentes em departamentos", icon: Users, href: "/settings/teams" },
    { label: "Etiquetas", description: "Crie e gerencie etiquetas coloridas", icon: Tag, href: "/settings/labels" },
    { label: "Automação", description: "Regras de automação e triggers", icon: Zap, href: "/settings/automation" },
    { label: "Atalhos", description: "Respostas prontas com \"/\"", icon: Keyboard, href: "/settings/shortcuts" },
    { label: "WhatsApp", description: "Configurações da Evolution API", icon: MessageSquare, href: "/settings/whatsapp" },
    { label: "Integrações", description: "Webhooks, Google Agenda e mais", icon: Webhook, href: "/settings/integrations" },
]

export default function SettingsPage() {
    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8">
            <div className="max-w-4xl">
                {/* Header */}
                <div className="mb-8 animate-slide-up">
                    <h1 className="text-2xl font-semibold text-white">Configurações</h1>
                    <p className="text-sm text-[#94A3B8] mt-1">Gerencie as configurações da sua conta</p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                    {settingSections.map((section) => {
                        const Icon = section.icon
                        return (
                            <Link
                                key={section.label}
                                href={section.href}
                                className="glass-card p-5 hover-lift hover-glow group transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center group-hover:from-blue-500/20 group-hover:to-violet-500/20 transition-all">
                                        <Icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white mb-0.5">{section.label}</h3>
                                        <p className="text-xs text-[#64748B]">{section.description}</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
