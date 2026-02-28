"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Bot,
    BarChart3,
    Settings,
    Calendar,
    Bell,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Kanban,
} from "lucide-react"
import { useState, useEffect } from "react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Chat",
        href: "/chat",
        icon: MessageSquare,
    },
    {
        label: "Contatos",
        href: "/contacts",
        icon: Users,
    },
    {
        label: "Pipeline",
        href: "/pipeline",
        icon: Kanban,
    },
    {
        label: "Agentes IA",
        href: "/agents",
        icon: Bot,
    },
    {
        label: "Agenda",
        href: "/calendar",
        icon: Calendar,
    },
    {
        label: "Relatórios",
        href: "/reports",
        icon: BarChart3,
    },
    {
        label: "Configurações",
        href: "/settings",
        icon: Settings,
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [collapsed, setCollapsed] = useState(false)
    const [userName, setUserName] = useState("")
    const [userInitials, setUserInitials] = useState("")
    const [unreadCount, setUnreadCount] = useState(0)
    const [inboxes, setInboxes] = useState<any[]>([])
    const [loadingInboxes, setLoadingInboxes] = useState(true)
    const supabase = createClient()

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch("/api/conversations/unread-count")
            const data = await res.json()
            if (typeof data.totalUnreadCount === 'number') {
                setUnreadCount(data.totalUnreadCount)
            }
        } catch (err) {
            console.error("Erro ao carregar unread count:", err)
        }
    }

    const fetchInboxes = async () => {
        try {
            const res = await fetch("/api/inboxes")
            const data = await res.json()
            console.log("[Sidebar] Inboxes fetched:", data)
            if (Array.isArray(data)) setInboxes(data)
        } catch (err) {
            console.error("Erro ao carregar inboxes:", err)
        } finally {
            setLoadingInboxes(false)
        }
    }

    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const name = user.user_metadata?.name || user.email?.split("@")[0] || "User"
                setUserName(name)
                const parts = name.split(" ")
                setUserInitials(
                    parts.length >= 2
                        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                        : name.substring(0, 2).toUpperCase()
                )
            }
        }
        loadUser()
        fetchUnreadCount()
        fetchInboxes()

        // Realtime subscription for unread count and inboxes
        const channel = supabase
            .channel('whatsapp_updates')
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                const { message } = payload
                if (message && !message.fromMe) {
                    fetchUnreadCount()
                }
            })
            .on('broadcast', { event: 'read_receipt' }, () => {
                fetchUnreadCount()
            })
            .on('broadcast', { event: 'inbox_status_updated' }, () => {
                fetchInboxes()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    return (
        <aside
            className={cn(
                "glass-sidebar h-screen flex flex-col transition-all duration-300 ease-in-out relative z-20",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
            data-version="1.5.0-inboxes"
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-white/[0.08]">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--nexcrm-gradient-start)] to-[var(--nexcrm-gradient-end)] flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                        <span className="text-white font-bold text-sm">N</span>
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-semibold text-white tracking-tight animate-fade-in">
                            Nex<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">CRM</span>
                        </span>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        const Icon = item.icon
                        const isChat = item.href === "/chat"

                        const linkContent = (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "apple-glass-panel text-white shadow-sm"
                                        : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                                )}
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400" />
                                )}

                                <div className="relative shrink-0">
                                    <Icon
                                        className={cn(
                                            "w-5 h-5 transition-colors",
                                            isActive
                                                ? "text-blue-400"
                                                : "text-white/50 group-hover:text-white/90"
                                        )}
                                    />
                                    {isChat && unreadCount > 0 && (
                                        <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] bg-red-500 border-0 flex items-center justify-center text-white p-0 shadow-sm animate-pulse">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </Badge>
                                    )}
                                </div>

                                {!collapsed && (
                                    <span className="animate-fade-in flex-1">{item.label}</span>
                                )}
                            </Link>
                        )

                        if (collapsed) {
                            return (
                                <Tooltip key={item.href} delayDuration={0}>
                                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                    <TooltipContent
                                        side="right"
                                        className="apple-glass-panel text-white outline-none border-white/10"
                                    >
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return linkContent
                    })}
                </nav>

                {/* Inboxes Section (Jus CRM Style) */}
                {!collapsed && (
                    <div className="space-y-3 px-2 animate-fade-in">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Caixas de Entrada</span>
                            <Link href="/settings/whatsapp" className="text-[10px] font-bold text-blue-400/70 hover:text-blue-400 transition-colors uppercase">Gerenciar</Link>
                        </div>
                        <div className="space-y-2">
                            {loadingInboxes ? (
                                <div className="space-y-2">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-12 w-full bg-white/5 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : inboxes.length === 0 ? (
                                <Link
                                    href="/settings/whatsapp"
                                    className="block p-4 rounded-2xl border border-dashed border-white/10 hover:border-white/20 transition-all text-center group"
                                >
                                    <p className="text-[10px] font-medium text-white/40 group-hover:text-white/60">Nenhuma caixa conectada</p>
                                    <span className="text-[10px] text-blue-400 font-bold mt-1 inline-block">CONECTAR AGORA</span>
                                </Link>
                            ) : (
                                inboxes.map(inbox => (
                                    <div key={inbox.id} className="apple-glass-panel p-3 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
                                                    {inbox.avatarUrl ? (
                                                        <img src={inbox.avatarUrl} alt={inbox.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <MessageSquare className="w-4 h-4 text-white/40" />
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#030712]",
                                                    inbox.status === 'CONNECTED' ? "bg-green-500" : "bg-red-500"
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-white/90 truncate">{inbox.name}</p>
                                                <p className="text-[9px] text-white/40 truncate">{inbox.phoneNumber || inbox.instanceName}</p>
                                            </div>
                                        </div>
                                        {inbox.status !== 'CONNECTED' && (
                                            <Link
                                                href={`/settings/whatsapp/${inbox.id}`}
                                                className="mt-2 block w-full py-1.5 rounded-xl bg-blue-500 text-[9px] font-bold text-white text-center hover:bg-blue-600 transition-colors uppercase"
                                            >
                                                Conectar
                                            </Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-white/[0.08] space-y-1">
                {/* Notifications */}
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link
                            href="/notifications"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                        >
                            <div className="relative shrink-0">
                                <Bell className="w-5 h-5" />
                                {/* Badge removed since we now have the Chat badge for unread messages */}
                            </div>
                            {!collapsed && <span className="animate-fade-in">Notificações</span>}
                        </Link>
                    </TooltipTrigger>
                    {collapsed && (
                        <TooltipContent
                            side="right"
                            className="apple-glass-panel text-white outline-none border-white/10"
                        >
                            Notificações
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* User profile */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.06] transition-all duration-200 cursor-pointer">
                    <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-violet-500/80 backdrop-blur-md border border-white/20 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">{userInitials || "N"}</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-xs font-medium text-white/90 truncate">{userName || "Admin"}</p>
                            <p className="text-[10px] text-white/50">Admin</p>
                        </div>
                    )}
                </div>

                {/* Sign out */}
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!collapsed && <span className="animate-fade-in text-xs font-medium">Sair da Conta</span>}
                        </button>
                    </TooltipTrigger>
                    {collapsed && (
                        <TooltipContent
                            side="right"
                            className="apple-glass-panel text-white outline-none border-white/10"
                        >
                            Sair
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center py-2.5 rounded-2xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-200 mt-2"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>
        </aside>
    )
}
