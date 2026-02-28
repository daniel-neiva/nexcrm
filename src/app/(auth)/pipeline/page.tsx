"use client"

import { useState, useEffect, useRef } from "react"
import {
    Loader2, Plus, X, GripVertical, MessageSquare, Bot, Phone,
    MoreVertical, Tag, Trash2, Pencil, ChevronRight, Eye
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface PipelineCard {
    id: string
    contactName: string
    contactPhone: string
    contactAvatar: string | null
    agentName: string | null
    lastMessage: string
    lastMessageAt: string
    status: string
    whatsappJid: string | null
}

interface PipelineColumn {
    id: string
    name: string
    color: string
    cards: PipelineCard[]
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

export default function PipelinePage() {
    const [columns, setColumns] = useState<PipelineColumn[]>([])
    const [untagged, setUntagged] = useState<PipelineColumn | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateLabel, setShowCreateLabel] = useState(false)
    const [newLabelName, setNewLabelName] = useState("")
    const [newLabelColor, setNewLabelColor] = useState("#3B82F6")
    const [creatingLabel, setCreatingLabel] = useState(false)
    const [draggedCard, setDraggedCard] = useState<{ card: PipelineCard; fromColumnId: string } | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const PRESET_COLORS = [
        "#EAB308", "#F97316", "#EF4444", "#EC4899",
        "#8B5CF6", "#3B82F6", "#06B6D4", "#22C55E",
        "#64748B", "#A855F7"
    ]

    useEffect(() => {
        fetchPipeline()
    }, [])

    const fetchPipeline = async () => {
        try {
            const res = await fetch("/api/pipeline")
            const data = await res.json()
            if (data.columns) setColumns(data.columns)
            if (data.untagged) setUntagged(data.untagged)
        } catch (error) {
            console.error("Failed to fetch pipeline", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateLabel = async () => {
        if (!newLabelName.trim()) return
        setCreatingLabel(true)
        try {
            const res = await fetch("/api/labels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newLabelName, color: newLabelColor })
            })
            if (res.ok) {
                const label = await res.json()
                // Auto-add the new label as a Kanban column
                setColumns(prev => [...prev, { id: label.id, name: label.name, color: label.color, cards: [] }])
                setNewLabelName("")
                setShowCreateLabel(false)
            } else {
                const err = await res.json()
                alert(err.error || "Erro ao criar etiqueta")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setCreatingLabel(false)
        }
    }

    const handleDeleteColumn = async (columnId: string) => {
        if (columnId === '__untagged') return
        if (!confirm("Excluir esta etiqueta? Os cards voltarão para 'Sem Etiqueta'.")) return
        try {
            await fetch(`/api/labels/${columnId}`, { method: "DELETE" })
            setColumns(prev => prev.filter(c => c.id !== columnId))
            fetchPipeline() // Refresh to get cards back in untagged
        } catch (error) {
            console.error(error)
        }
    }

    // Drag and Drop handlers
    const handleDragStart = (card: PipelineCard, fromColumnId: string) => {
        setDraggedCard({ card, fromColumnId })
    }

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault()
        setDragOverColumn(columnId)
    }

    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    const handleDrop = async (e: React.DragEvent, toColumnId: string) => {
        e.preventDefault()
        setDragOverColumn(null)

        if (!draggedCard || draggedCard.fromColumnId === toColumnId) {
            setDraggedCard(null)
            return
        }

        const { card, fromColumnId } = draggedCard
        setDraggedCard(null)

        // Optimistic UI: move card between columns
        // Remove from source
        if (fromColumnId === '__untagged') {
            setUntagged(prev => prev ? { ...prev, cards: prev.cards.filter(c => c.id !== card.id) } : prev)
        } else {
            setColumns(prev => prev.map(col =>
                col.id === fromColumnId ? { ...col, cards: col.cards.filter(c => c.id !== card.id) } : col
            ))
        }

        // Add to destination
        if (toColumnId === '__untagged') {
            setUntagged(prev => prev ? { ...prev, cards: [card, ...prev.cards] } : prev)
        } else {
            setColumns(prev => prev.map(col =>
                col.id === toColumnId ? { ...col, cards: [card, ...col.cards] } : col
            ))
        }

        // API calls: remove old label, add new label
        try {
            if (fromColumnId !== '__untagged') {
                await fetch(`/api/conversations/${card.id}/labels`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ labelId: fromColumnId })
                })
            }
            if (toColumnId !== '__untagged') {
                await fetch(`/api/conversations/${card.id}/labels`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ labelId: toColumnId })
                })
            }
        } catch (error) {
            console.error("Failed to move card", error)
            fetchPipeline() // Revert
        }
    }

    const allColumns = [...columns, ...(untagged ? [untagged] : [])]

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm text-white/40 font-medium">Carregando pipeline...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:px-8 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                            <Tag className="w-6 h-6 text-blue-400" />
                            Pipeline de Leads
                        </h1>
                        <p className="text-sm text-[#94A3B8] mt-1">
                            Arraste os cards entre as colunas para atualizar o estágio
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateLabel(true)}
                        className="btn-gradient px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Etiqueta
                    </button>
                </div>
            </div>

            {/* Create Label Modal */}
            {showCreateLabel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateLabel(false)}>
                    <div className="apple-glass-panel rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-white mb-4">Nova Etiqueta</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Nome</label>
                                <Input
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    placeholder="Ex: Aguardando Pagamento"
                                    className="bg-white/5 border-white/10 rounded-xl h-11"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Cor</label>
                                <div className="flex gap-2 flex-wrap">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewLabelColor(color)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg transition-all duration-200",
                                                newLabelColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a14] scale-110" : "hover:scale-110"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: newLabelColor }} />
                                <span className="text-xs font-mono text-white/40">{newLabelColor}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowCreateLabel(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateLabel}
                                disabled={creatingLabel || !newLabelName.trim()}
                                className="btn-primary px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                {creatingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Etiqueta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden p-6 lg:px-8"
            >
                <div className="flex gap-4 h-full min-w-max">
                    {allColumns.map((column) => (
                        <div
                            key={column.id}
                            className={cn(
                                "w-[320px] shrink-0 flex flex-col rounded-2xl border transition-all duration-200",
                                dragOverColumn === column.id
                                    ? "border-blue-500/50 bg-blue-500/5"
                                    : "border-white/[0.06] bg-white/[0.02]"
                            )}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06] shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: column.color, boxShadow: `0 0 12px ${column.color}40` }} />
                                    <span className="text-sm font-bold text-white/80">{column.name}</span>
                                    <Badge className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border border-white/10 text-white/50 font-bold">
                                        {column.cards.length}
                                    </Badge>
                                </div>
                                {column.id !== '__untagged' && (
                                    <button
                                        onClick={() => handleDeleteColumn(column.id)}
                                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {column.cards.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-white/20">
                                        <MessageSquare className="w-6 h-6 mb-2" />
                                        <span className="text-xs font-medium">Nenhum lead</span>
                                    </div>
                                ) : (
                                    column.cards.map((card) => (
                                        <div
                                            key={card.id}
                                            draggable
                                            onDragStart={() => handleDragStart(card, column.id)}
                                            className="group glass-card p-4 rounded-xl cursor-grab active:cursor-grabbing hover-lift transition-all duration-200 border border-white/[0.06] hover:border-white/10"
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-center gap-3 mb-2.5">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/10 shrink-0">
                                                    {card.contactAvatar ? (
                                                        <img src={card.contactAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-white/80">{getInitials(card.contactName)}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-semibold text-white/90 truncate">{card.contactName}</h4>
                                                    {card.contactPhone && (
                                                        <p className="text-[10px] text-white/40 flex items-center gap-1">
                                                            <Phone className="w-2.5 h-2.5" />
                                                            {card.contactPhone}
                                                        </p>
                                                    )}
                                                </div>
                                                <GripVertical className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
                                            </div>

                                            {/* Last Message Preview */}
                                            {card.lastMessage && (
                                                <p className="text-xs text-white/40 line-clamp-2 mb-2.5 leading-relaxed">
                                                    {card.lastMessage}
                                                </p>
                                            )}

                                            {/* Card Footer */}
                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                                <div className="flex items-center gap-2">
                                                    {card.agentName && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                                            <Bot className="w-2.5 h-2.5" />
                                                            {card.agentName}
                                                        </span>
                                                    )}
                                                    <Badge className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0 border-0",
                                                        card.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400' :
                                                            card.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-400' :
                                                                'bg-gray-500/15 text-gray-400'
                                                    )}>
                                                        {card.status === 'OPEN' ? 'Aberto' : card.status === 'PENDING' ? 'Pendente' : 'Resolvido'}
                                                    </Badge>
                                                </div>
                                                <span className="text-[10px] text-white/30 font-medium">
                                                    {timeAgo(card.lastMessageAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Column Button */}
                    <button
                        onClick={() => setShowCreateLabel(true)}
                        className="w-[320px] shrink-0 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 hover:border-blue-500/30 bg-white/[0.01] hover:bg-blue-500/5 transition-all duration-300 group min-h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-3 group-hover:from-blue-500/20 group-hover:to-violet-500/20 transition-all">
                            <Plus className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                        </div>
                        <span className="text-sm font-medium text-white/50 group-hover:text-white/80">Nova Coluna</span>
                        <span className="text-xs text-white/30 mt-0.5">Criar etiqueta</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
