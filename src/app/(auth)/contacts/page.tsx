"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Search, Plus, MoreHorizontal, Filter, Mail, Phone, User as UserIcon,
    Loader2, MessageSquare, Tag, X, Check, Pencil, ExternalLink, ChevronLeft, ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ContactLabel {
    id: string
    name: string
    color: string
}

interface ContactData {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    avatarUrl: string | null
    createdAt: string
    labels: ContactLabel[]
    lastConversation: {
        id: string
        status: string
        updatedAt: string
        lastMessage: string | null
        lastMessageAt: string | null
    } | null
}

function getInitials(name: string) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
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

export default function ContactsPage() {
    const [contacts, setContacts] = useState<ContactData[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [searchDebounced, setSearchDebounced] = useState("")
    const [allLabels, setAllLabels] = useState<ContactLabel[]>([])
    const [filterLabel, setFilterLabel] = useState<string | null>(null)
    const [showFilterDropdown, setShowFilterDropdown] = useState(false)

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editEmail, setEditEmail] = useState("")
    const [editPhone, setEditPhone] = useState("")

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounced(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    // Fetch labels
    useEffect(() => {
        fetch("/api/labels")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setAllLabels(data) })
            .catch(() => { })
    }, [])

    // Fetch contacts
    const fetchContacts = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: "50" })
            if (searchDebounced) params.set("search", searchDebounced)
            if (filterLabel) params.set("label", filterLabel)

            const res = await fetch(`/api/contacts?${params}`)
            const data = await res.json()
            if (data.contacts) {
                setContacts(data.contacts)
                setTotal(data.total)
                setPages(data.pages)
            }
        } catch (error) {
            console.error("Failed to fetch contacts", error)
        } finally {
            setIsLoading(false)
        }
    }, [page, searchDebounced, filterLabel])

    useEffect(() => { fetchContacts() }, [fetchContacts])

    // Reset page when search/filter changes
    useEffect(() => { setPage(1) }, [searchDebounced, filterLabel])

    const startEdit = (contact: ContactData) => {
        setEditingId(contact.id)
        setEditName(contact.name || "")
        setEditEmail(contact.email || "")
        setEditPhone(contact.phone || "")
    }

    const cancelEdit = () => { setEditingId(null) }

    const saveEdit = async () => {
        if (!editingId) return
        try {
            await fetch("/api/contacts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, name: editName, email: editEmail, phone: editPhone })
            })
            // Optimistic update
            setContacts(prev => prev.map(c =>
                c.id === editingId ? { ...c, name: editName, email: editEmail, phone: editPhone } : c
            ))
            setEditingId(null)
        } catch (error) {
            console.error("Failed to save contact", error)
        }
    }

    const activeFilterLabel = allLabels.find(l => l.id === filterLabel)

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-slide-up">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90 flex items-center gap-3">
                            <UserIcon className="w-7 h-7 text-violet-400" />
                            Contatos
                        </h1>
                        <p className="text-sm font-medium text-[#94A3B8] mt-1">
                            {isLoading ? "Carregando..." : `${total} contatos sincronizados`}
                        </p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <div className="relative w-full sm:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors duration-300" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nome, email ou telefone..."
                            className="w-full pl-12 pr-4 h-12 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/90 placeholder:text-white/30 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-white/10 transition-colors shadow-inner backdrop-blur-md"
                        />
                    </div>

                    {/* Label Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className={cn(
                                "flex items-center h-12 gap-2 px-5 rounded-2xl text-sm font-semibold border transition-all shadow-inner backdrop-blur-md",
                                filterLabel
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    : "text-white/70 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Tag className="w-4 h-4" />
                            {activeFilterLabel ? activeFilterLabel.name : "Filtrar por Etiqueta"}
                            {filterLabel && (
                                <X className="w-3.5 h-3.5 ml-1 hover:text-white" onClick={(e) => { e.stopPropagation(); setFilterLabel(null) }} />
                            )}
                        </button>
                        {showFilterDropdown && (
                            <div className="absolute top-14 left-0 z-50 apple-glass-panel rounded-xl p-2 min-w-[200px] shadow-2xl border border-white/10">
                                <button
                                    onClick={() => { setFilterLabel(null); setShowFilterDropdown(false) }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-white/50 hover:bg-white/5 rounded-lg"
                                >
                                    Todos os contatos
                                </button>
                                {allLabels.map(label => (
                                    <button
                                        key={label.id}
                                        onClick={() => { setFilterLabel(label.id); setShowFilterDropdown(false) }}
                                        className="w-full text-left px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5 rounded-lg flex items-center gap-2"
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                                        {label.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="apple-glass-panel rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                        <UserIcon className="w-12 h-12 text-white/20 mb-4" />
                        <p className="text-sm font-semibold text-white/50 mb-1">Nenhum contato encontrado</p>
                        <p className="text-xs text-white/30">
                            {search ? "Tente uma busca diferente" : "Os contatos aparecerão aqui quando receberem mensagens"}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden sm:block apple-glass-panel rounded-3xl overflow-hidden shadow-2xl relative animate-slide-up" style={{ animationDelay: "0.2s" }}>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-black/20">
                                        <th className="text-left px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest">Contato</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest">Informações</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest">Etiquetas</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest">Última Atividade</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {contacts.map((contact) => (
                                        <tr key={contact.id} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/10 shrink-0">
                                                        {contact.avatarUrl ? (
                                                            <img src={contact.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-white/70">
                                                                {getInitials(contact.name || contact.phone || "?")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {editingId === contact.id ? (
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="h-8 text-sm bg-white/5 border-white/10 rounded-lg w-40"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div>
                                                            <p className="text-sm font-semibold text-white/90">{contact.name || "Sem nome"}</p>
                                                            <p className="text-[10px] text-white/30 mt-0.5">
                                                                {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === contact.id ? (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-3 h-3 text-white/30 shrink-0" />
                                                            <Input
                                                                value={editEmail}
                                                                onChange={(e) => setEditEmail(e.target.value)}
                                                                placeholder="email@exemplo.com"
                                                                className="h-7 text-xs bg-white/5 border-white/10 rounded-lg w-44"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-3 h-3 text-white/30 shrink-0" />
                                                            <Input
                                                                value={editPhone}
                                                                onChange={(e) => setEditPhone(e.target.value)}
                                                                className="h-7 text-xs bg-white/5 border-white/10 rounded-lg w-44"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {contact.email && (
                                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                                <Mail className="w-3 h-3 text-white/30" />
                                                                {contact.email}
                                                            </div>
                                                        )}
                                                        {contact.phone && (
                                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                                <Phone className="w-3 h-3 text-white/30" />
                                                                {contact.phone}
                                                            </div>
                                                        )}
                                                        {!contact.email && !contact.phone && (
                                                            <span className="text-xs text-white/20">Sem informações</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {contact.labels.map(label => (
                                                        <span key={label.id} className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${label.color}20`, color: label.color }}>
                                                            {label.name}
                                                        </span>
                                                    ))}
                                                    {contact.labels.length === 0 && (
                                                        <span className="text-[10px] text-white/20">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {contact.lastConversation ? (
                                                    <div>
                                                        <p className="text-xs text-white/50 truncate max-w-[180px]">
                                                            {contact.lastConversation.lastMessage || "Sem mensagens"}
                                                        </p>
                                                        <p className="text-[10px] text-white/25 mt-0.5">
                                                            {timeAgo(contact.lastConversation.lastMessageAt || contact.lastConversation.updatedAt)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-white/20">Sem conversas</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingId === contact.id ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={saveEdit} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEdit(contact)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all" title="Editar">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <Link href="/chat" className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Abrir conversa">
                                                            <MessageSquare className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                            {contacts.map(contact => (
                                <div key={contact.id} className="apple-glass-panel p-4 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/10 shrink-0">
                                            {contact.avatarUrl ? (
                                                <img src={contact.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <span className="text-[11px] font-bold text-white/70">
                                                    {getInitials(contact.name || contact.phone || "?")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white/90 truncate">{contact.name || "Sem nome"}</p>
                                            <p className="text-[10px] text-white/30">{contact.phone}</p>
                                        </div>
                                        <button onClick={() => startEdit(contact)} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {contact.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {contact.labels.map(label => (
                                                <span key={label.id} className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${label.color}20`, color: label.color }}>
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {contact.lastConversation?.lastMessage && (
                                        <p className="text-xs text-white/40 truncate">{contact.lastConversation.lastMessage}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-white/50 font-medium">
                                    Página {page} de {pages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    disabled={page === pages}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
