"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
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
    const supabase = createClient()

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
    }, [supabase])

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    return (
        <aside
            className={cn(
                "glass-sidebar h-screen flex flex-col transition-all duration-300 ease-in-out z-50",
                collapsed ? "w-[72px]" : "w-[240px]"
            )}
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-white/5">
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
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    const Icon = item.icon

                    const linkContent = (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500/15 to-violet-500/10 text-white shadow-sm"
                                    : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                            )}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400" />
                            )}

                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-colors shrink-0",
                                    isActive
                                        ? "text-blue-400"
                                        : "text-[#64748B] group-hover:text-white"
                                )}
                            />

                            {!collapsed && (
                                <span className="animate-fade-in">{item.label}</span>
                            )}
                        </Link>
                    )

                    if (collapsed) {
                        return (
                            <Tooltip key={item.href} delayDuration={0}>
                                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    className="bg-[#1A1D24] border-white/10 text-white"
                                >
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    }

                    return linkContent
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-3 border-t border-white/5 space-y-2">
                {/* Notifications */}
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link
                            href="/notifications"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all duration-200"
                        >
                            <div className="relative shrink-0">
                                <Bell className="w-5 h-5" />
                                <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] bg-gradient-to-r from-blue-500 to-violet-500 border-0 text-white">
                                    3
                                </Badge>
                            </div>
                            {!collapsed && <span className="animate-fade-in">Notificações</span>}
                        </Link>
                    </TooltipTrigger>
                    {collapsed && (
                        <TooltipContent
                            side="right"
                            className="bg-[#1A1D24] border-white/10 text-white"
                        >
                            Notificações
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* User profile */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer">
                    <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">{userInitials || "..."}</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--nexcrm-success)] border-2 border-[#0D0F12]" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-xs font-medium text-white truncate">{userName || "..."}</p>
                            <p className="text-[10px] text-[#64748B]">Admin</p>
                        </div>
                    )}
                </div>

                {/* Sign out */}
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!collapsed && <span className="animate-fade-in text-xs">Sair</span>}
                        </button>
                    </TooltipTrigger>
                    {collapsed && (
                        <TooltipContent
                            side="right"
                            className="bg-[#1A1D24] border-white/10 text-white"
                        >
                            Sair
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center py-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all duration-200"
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
