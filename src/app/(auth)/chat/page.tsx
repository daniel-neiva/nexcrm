"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Send, Paperclip, Smile, Phone, Video, Bot, MoreVertical, Loader2, MessageSquare, Users, Download, Play, FileText, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Chat {
    id: string
    name: string
    phone: string
    phoneFormatted?: string
    isGroup?: boolean
    isLid?: boolean
    lastMessage?: string
    lastActivity: string | null
    unread: number
    profilePicUrl?: string | null
}

interface Message {
    id: string
    content: string
    type: string
    messageType?: string
    mimetype?: string
    fromMe: boolean
    remoteJid: string
    timestamp: string | null
    senderName: string | null
    hasMedia?: boolean
}

function formatTime(timestamp: string | null) {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "agora"
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatMessageTime(timestamp: string | null) {
    if (!timestamp) return ""
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    })
}

function getInitials(name: string) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
}

// ===== Media Component =====
function MediaContent({ msg, onImageClick }: { msg: Message; onImageClick?: (url: string) => void }) {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const loadMedia = useCallback(async () => {
        if (mediaUrl || loading) return
        setLoading(true)
        try {
            const res = await fetch("/api/whatsapp/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messageId: msg.id,
                    remoteJid: msg.remoteJid,
                    fromMe: msg.fromMe,
                }),
            })
            if (res.ok) {
                const blob = await res.blob()
                setMediaUrl(URL.createObjectURL(blob))
            } else {
                setError(true)
            }
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [msg.id, msg.remoteJid, msg.fromMe, mediaUrl, loading])

    // Auto-load images
    useEffect(() => {
        if (msg.type === "image") loadMedia()
    }, [msg.type, loadMedia])

    if (error) {
        return <p className="text-xs opacity-50 italic">Mídia indisponível</p>
    }

    switch (msg.type) {
        case "image":
            if (loading) return <div className="w-48 h-32 rounded-lg bg-white/5 animate-pulse flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            if (mediaUrl) return (
                <div className="space-y-1">
                    <img src={mediaUrl} alt="Imagem" className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onImageClick?.(mediaUrl)} />
                    {msg.content && <p className="whitespace-pre-wrap break-words text-sm mt-1">{msg.content}</p>}
                </div>
            )
            return <button onClick={loadMedia} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"><Download className="w-3.5 h-3.5" /> Carregar imagem</button>

        case "audio":
            if (loading) return <div className="w-48 h-10 rounded-lg bg-white/5 animate-pulse" />
            if (mediaUrl) return <audio controls src={mediaUrl} className="max-w-[260px]" />
            return (
                <button onClick={loadMedia} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <Play className="w-4 h-4 text-blue-400" /> <span>🎵 Ouvir áudio</span>
                </button>
            )

        case "video":
            if (loading) return <div className="w-48 h-32 rounded-lg bg-white/5 animate-pulse flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            if (mediaUrl) return (
                <div className="space-y-1">
                    <video controls src={mediaUrl} className="max-w-[280px] rounded-lg" />
                    {msg.content && <p className="whitespace-pre-wrap break-words text-sm mt-1">{msg.content}</p>}
                </div>
            )
            return (
                <button onClick={loadMedia} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <Play className="w-4 h-4 text-blue-400" /> <span>🎬 Ver vídeo</span>
                </button>
            )

        case "document":
            if (loading) return <div className="w-48 h-10 rounded-lg bg-white/5 animate-pulse" />
            if (mediaUrl) return (
                <a href={mediaUrl} download={msg.content || "documento"} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <FileText className="w-4 h-4 text-blue-400" /> <span>{msg.content || "📄 Documento"}</span> <Download className="w-3.5 h-3.5 ml-auto text-[#64748B]" />
                </a>
            )
            return (
                <button onClick={loadMedia} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <FileText className="w-4 h-4 text-blue-400" /> <span>{msg.content || "📄 Documento"}</span>
                </button>
            )

        default:
            return null
    }
}

export default function ChatPage() {
    const [chats, setChats] = useState<Chat[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
    const [messageInput, setMessageInput] = useState("")
    const [loadingChats, setLoadingChats] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sendingMessage, setSendingMessage] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [filter, setFilter] = useState<"all" | "personal" | "groups">("all")
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    // Load chats
    useEffect(() => {
        async function loadChats() {
            try {
                const res = await fetch("/api/whatsapp?action=chats")
                const data = await res.json()
                if (Array.isArray(data)) setChats(data)
            } catch (err) {
                console.error("Erro ao carregar chats:", err)
            } finally {
                setLoadingChats(false)
            }
        }
        loadChats()
    }, [])

    // Load messages when chat is selected
    const loadMessages = useCallback(async (chat: Chat) => {
        setLoadingMessages(true)
        try {
            const res = await fetch(`/api/whatsapp?action=messages&jid=${encodeURIComponent(chat.id)}`)
            const data = await res.json()
            if (Array.isArray(data)) setMessages(data)
        } catch (err) {
            console.error("Erro ao carregar mensagens:", err)
        } finally {
            setLoadingMessages(false)
        }
    }, [])

    useEffect(() => {
        if (selectedChat) loadMessages(selectedChat)
    }, [selectedChat, loadMessages])

    // Auto-scroll to bottom of messages only
    useEffect(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages])

    // Send message
    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault()
        if (!messageInput.trim() || !selectedChat || sendingMessage) return

        const text = messageInput.trim()
        setMessageInput("")
        setSendingMessage(true)

        // Optimistic update
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content: text,
            type: "text",
            fromMe: true,
            remoteJid: selectedChat.id,
            timestamp: new Date().toISOString(),
            senderName: null,
        }
        setMessages((prev) => [...prev, optimisticMsg])

        try {
            await fetch("/api/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: selectedChat.id, text }),
            })
        } catch (err) {
            console.error("Erro ao enviar:", err)
        } finally {
            setSendingMessage(false)
        }
    }

    // Filter chats
    const filteredChats = chats.filter((chat) => {
        const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.phone.includes(searchQuery)
        if (filter === "personal") return matchesSearch && !chat.isGroup
        if (filter === "groups") return matchesSearch && chat.isGroup
        return matchesSearch
    })

    const groupCount = chats.filter(c => c.isGroup).length
    const personalCount = chats.filter(c => !c.isGroup).length

    return (
        <div className="flex h-full overflow-hidden">
            {/* Conversation List */}
            <div className="w-[340px] border-r border-white/5 flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-white">WhatsApp</h2>
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-0">
                            ● Conectado
                        </Badge>
                    </div>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                        <Input
                            placeholder="Buscar conversas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-sm text-white placeholder:text-[#64748B] focus:ring-blue-500/30 focus:border-blue-500/50"
                        />
                    </div>
                    {/* Filter tabs */}
                    <div className="flex gap-1">
                        <button onClick={() => setFilter("all")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-medium", filter === "all" ? "bg-white/10 text-white" : "text-[#64748B] hover:text-white hover:bg-white/5")}>
                            Todas ({chats.length})
                        </button>
                        <button onClick={() => setFilter("personal")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-medium", filter === "personal" ? "bg-white/10 text-white" : "text-[#64748B] hover:text-white hover:bg-white/5")}>
                            Pessoais ({personalCount})
                        </button>
                        <button onClick={() => setFilter("groups")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-medium", filter === "groups" ? "bg-white/10 text-white" : "text-[#64748B] hover:text-white hover:bg-white/5")}>
                            Grupos ({groupCount})
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {loadingChats ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-20 text-[#64748B] text-sm">
                            Nenhuma conversa encontrada
                        </div>
                    ) : (
                        <div className="p-2 space-y-0.5">
                            {filteredChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                                        selectedChat?.id === chat.id
                                            ? "bg-gradient-to-r from-blue-500/10 to-violet-500/5 border border-white/5"
                                            : "hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border border-white/10 shrink-0",
                                        chat.isGroup
                                            ? "bg-gradient-to-br from-violet-500/20 to-purple-500/20"
                                            : "bg-gradient-to-br from-blue-500/20 to-violet-500/20"
                                    )}>
                                        {chat.isGroup ? (
                                            <Users className="w-4 h-4 text-violet-300" />
                                        ) : (
                                            <span className="text-xs font-semibold text-white">
                                                {getInitials(chat.name)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                                            <span className="text-[10px] text-[#64748B] shrink-0">
                                                {formatTime(chat.lastActivity)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#64748B] truncate">{chat.lastMessage || chat.phoneFormatted || `+${chat.phone}`}</p>
                                    </div>
                                    {chat.unread > 0 && (
                                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-blue-500 to-violet-500 border-0 text-white shrink-0">
                                            {chat.unread}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedChat ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat Header */}
                    <div className="h-16 px-5 flex items-center justify-between border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center border border-white/10",
                                selectedChat.isGroup
                                    ? "bg-gradient-to-br from-violet-500/30 to-purple-500/30"
                                    : "bg-gradient-to-br from-blue-500/30 to-violet-500/30"
                            )}>
                                {selectedChat.isGroup ? (
                                    <Users className="w-4 h-4 text-violet-300" />
                                ) : (
                                    <span className="text-xs font-semibold text-white">
                                        {getInitials(selectedChat.name)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">{selectedChat.name}</h3>
                                <p className="text-[11px] text-[#64748B]">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <Phone className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <Video className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <Bot className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="p-5 max-w-3xl mx-auto">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 text-[#64748B] text-sm">
                                    Nenhuma mensagem nesta conversa
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex",
                                                msg.fromMe ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[75%] px-4 py-2.5 text-sm",
                                                    msg.fromMe
                                                        ? "chat-bubble-sent"
                                                        : "chat-bubble-received text-white"
                                                )}
                                            >
                                                {/* Group sender name */}
                                                {selectedChat.isGroup && !msg.fromMe && msg.senderName && (
                                                    <p className="text-[11px] font-medium text-blue-400 mb-1">{msg.senderName}</p>
                                                )}

                                                {/* Media content */}
                                                {msg.hasMedia ? (
                                                    <MediaContent msg={msg} onImageClick={setLightboxUrl} />
                                                ) : (
                                                    msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                )}

                                                {/* Text-only without media */}
                                                {!msg.hasMedia && !msg.content && msg.type === "sticker" && (
                                                    <p className="text-xs opacity-70">🏷️ Figurinha</p>
                                                )}

                                                <p
                                                    className={cn(
                                                        "text-[10px] mt-1",
                                                        msg.fromMe ? "text-white/60" : "text-[#64748B]"
                                                    )}
                                                >
                                                    {formatMessageTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 shrink-0">
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            <button type="button" className="p-2.5 rounded-xl text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <Smile className="w-5 h-5" />
                            </button>
                            <button type="button" className="p-2.5 rounded-xl text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <Input
                                placeholder="Digite uma mensagem..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                className="flex-1 bg-white/5 border-white/10 text-sm text-white placeholder:text-[#64748B] focus:ring-blue-500/30 focus:border-blue-500/50 rounded-xl"
                            />
                            <button
                                type="submit"
                                disabled={sendingMessage || !messageInput.trim()}
                                className="btn-gradient p-2.5 rounded-xl disabled:opacity-50"
                            >
                                {sendingMessage ? (
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* No Chat Selected */
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center animate-fade-in">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-10 h-10 text-[#64748B]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">WhatsApp conectado</h3>
                        <p className="text-sm text-[#64748B]">
                            Selecione uma conversa para começar
                        </p>
                        <p className="text-xs text-[#4a4f5a] mt-2">
                            {chats.length} conversas carregadas
                        </p>
                    </div>
                </div>
            )}

            {/* Contact Panel */}
            {selectedChat && (
                <div className="w-[280px] border-l border-white/5 p-4 hidden xl:block shrink-0 overflow-y-auto">
                    <div className="flex flex-col items-center text-center mb-6 pt-4">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 mb-3 shadow-lg",
                            selectedChat.isGroup
                                ? "bg-gradient-to-br from-violet-500/30 to-purple-500/30 shadow-violet-500/10"
                                : "bg-gradient-to-br from-blue-500/30 to-violet-500/30 shadow-blue-500/10"
                        )}>
                            {selectedChat.isGroup ? (
                                <Users className="w-7 h-7 text-violet-300" />
                            ) : (
                                <span className="text-lg font-bold text-white">
                                    {getInitials(selectedChat.name)}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-semibold text-white">{selectedChat.name}</h3>
                        <p className="text-xs text-[#64748B]">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="glass-card p-3">
                            <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">{selectedChat.isGroup ? "Tipo" : "Canal"}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                                    {selectedChat.isGroup ? (
                                        <Users className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                                    )}
                                </div>
                                <span className="text-xs text-white">
                                    {selectedChat.isGroup ? "Grupo WhatsApp" : "WhatsApp"}
                                </span>
                            </div>
                        </div>
                        {!selectedChat.isGroup && (
                            <div className="glass-card p-3">
                                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Telefone</p>
                                <p className="text-xs text-white">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                            </div>
                        )}
                        <div className="glass-card p-3">
                            <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Agente IA</p>
                            <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-[#64748B]" />
                                <span className="text-xs text-[#94A3B8]">Nenhum atribuído</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Overlay */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
                        onClick={(e) => { e.stopPropagation(); setLightboxUrl(null) }}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Visualização"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}
