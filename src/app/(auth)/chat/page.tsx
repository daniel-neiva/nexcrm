"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Search, Phone, Loader2, Send, Bot, Trash2, ChevronDown, X,
    Check, Volume2, Video, FileText, Play, Download, RotateCcw, Plus, MessageSquarePlus,
    Users, MoreVertical, MessageSquare, Smile, Paperclip, Tag
} from "lucide-react"
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
    isRead?: boolean
    remoteJid: string
    timestamp: string | null
    senderName: string | null
    senderProfilePicUrl?: string | null
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
            return (
                <div className="space-y-1">
                    <button onClick={loadMedia} className="flex flex-col items-start px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 text-sm text-blue-400 font-medium">
                            <Download className="w-4 h-4" /> <span>Carregar imagem</span>
                        </div>
                    </button>
                    {msg.content && <p className="whitespace-pre-wrap break-words text-sm mt-1">{msg.content}</p>}
                </div>
            )

        case "audio":
            if (loading) return <div className="w-48 h-10 rounded-lg bg-white/5 animate-pulse" />
            if (mediaUrl) return <audio controls src={mediaUrl} className="max-w-[260px]" />
            return (
                <div className="space-y-1">
                    <button onClick={loadMedia} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                        <Play className="w-4 h-4 text-blue-400" /> <span>🎵 Ouvir áudio</span>
                    </button>
                    {msg.content && <p className="whitespace-pre-wrap break-words text-sm mt-1">{msg.content}</p>}
                </div>
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
                <div className="space-y-1">
                    <button onClick={loadMedia} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all shadow-sm">
                        <Play className="w-4 h-4" /> <span className="font-semibold text-sm tracking-wide">Ver vídeo</span>
                    </button>
                    {msg.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed mt-2">{msg.content}</p>}
                </div>
            )

        case "document":
            if (loading) return <div className="w-48 h-10 rounded-lg bg-white/5 animate-pulse" />
            if (mediaUrl) return (
                <a href={mediaUrl} download={msg.content || "documento"} className="flex flex-col items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 w-full">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="truncate">{msg.content || "📄 Documento"}</span>
                        <Download className="w-3.5 h-3.5 ml-auto text-[#64748B] shrink-0" />
                    </div>
                </a>
            )
            return (
                <div className="space-y-1">
                    <button onClick={loadMedia} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" /> <span className="truncate">{msg.content ? "📄 Carregar documento" : "📄 Documento"}</span>
                    </button>
                    {msg.content && <p className="whitespace-pre-wrap break-words text-sm mt-1">{msg.content}</p>}
                </div>
            )

        default:
            return null
    }
}

import { createClient } from "@/lib/supabase/client"

export default function ChatPage() {
    const [chats, setChats] = useState<Chat[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
    const [messageInput, setMessageInput] = useState("")
    const [loadingChats, setLoadingChats] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sendingMessage, setSendingMessage] = useState(false)
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filter, setFilter] = useState<"all" | "personal" | "groups">("all")
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    // New conversation state
    const [showNewChat, setShowNewChat] = useState(false)
    const [newChatPhone, setNewChatPhone] = useState("")
    const [newChatMessage, setNewChatMessage] = useState("")
    const [sendingNewChat, setSendingNewChat] = useState(false)

    // Agent assignment state
    const [agents, setAgents] = useState<{ id: string; name: string; isActive: boolean }[]>([])
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null)
    const [aiEnabled, setAiEnabled] = useState(true)
    const [assigningAgent, setAssigningAgent] = useState(false)

    // Labels state
    const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([])
    const [conversationLabels, setConversationLabels] = useState<{ id: string; name: string; color: string }[]>([])
    const [showLabelDropdown, setShowLabelDropdown] = useState(false)
    const [labelFilter, setLabelFilter] = useState<string | null>(null)
    const [showLabelFilter, setShowLabelFilter] = useState(false)
    // Map of all chat labels: { [whatsappJid]: [{ id, name, color }] }
    const [chatLabelsMap, setChatLabelsMap] = useState<Record<string, { id: string; name: string; color: string }[]>>({})

    const supabase = createClient()

    // Fetch available AI agents, labels, and all conversation labels on mount
    useEffect(() => {
        fetch('/api/agents')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setAgents(data.filter((a: any) => a.isActive)) })
            .catch(() => { })
        fetch('/api/labels')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setAllLabels(data) })
            .catch(() => { })
        fetch('/api/labels/conversations')
            .then(r => r.json())
            .then(data => { if (data && typeof data === 'object' && !data.error) setChatLabelsMap(data) })
            .catch(() => { })
    }, [])

    // Realtime Incoming Messages
    // Use a ref so the subscription callback always sees the latest selectedChat without re-subscribing
    const selectedChatRef = useRef<Chat | null>(null)
    useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])

    useEffect(() => {
        const channel = supabase.channel('whatsapp_updates')
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                const incomingMsg = payload.message as Message
                const incomingChat = payload.chat as { id: string, unreadCount: number }
                const currentSelectedChat = selectedChatRef.current

                // If the message belongs to the currently open chat, append it
                if (currentSelectedChat?.id === incomingMsg.remoteJid) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === incomingMsg.id)) return prev
                        return [...prev, incomingMsg]
                    })
                    // Auto-mark read
                    if (!incomingMsg.fromMe) {
                        fetch("/api/whatsapp/read", {
                            method: "POST",
                            body: JSON.stringify({ remoteJid: incomingMsg.remoteJid })
                        }).catch(console.error)
                    }
                }

                // Update chat list: bump to top, update preview, unread count
                setChats(prev => {
                    const chatIndex = prev.findIndex(c => c.id === incomingMsg.remoteJid)

                    if (chatIndex === -1) {
                        // Brand new conversation — reload the full chat list from API
                        fetch("/api/whatsapp?action=chats", { cache: "no-store" })
                            .then(r => r.json())
                            .then(data => { if (Array.isArray(data)) setChats(data) })
                            .catch(console.error)
                        return prev // return unchanged for now, the fetch above will overwrite
                    }

                    const updatedChat = {
                        ...prev[chatIndex],
                        lastMessage: incomingMsg.content,
                        lastActivity: incomingMsg.timestamp,
                        unread: (selectedChatRef.current?.id === incomingMsg.remoteJid) ? 0 : incomingChat.unreadCount
                    }
                    const newChats = [...prev]
                    newChats.splice(chatIndex, 1)
                    newChats.unshift(updatedChat)
                    return newChats
                })
            })
            .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
                const { chat } = payload
                if (chat?.id) {
                    setChats(prev => prev.map(c =>
                        c.id === chat.id ? { ...c, unread: 0 } : c
                    ))
                }
            })
            .on('broadcast', { event: 'message_status_update' }, ({ payload }) => {
                const { remoteJid, isRead } = payload
                if (selectedChatRef.current?.id === remoteJid) {
                    setMessages(prev => prev.map(m =>
                        m.fromMe ? { ...m, isRead: isRead } : m
                    ))
                }
            })
            .on('broadcast', { event: 'messages_cleared' }, ({ payload }) => {
                const { remoteJid } = payload
                if (selectedChatRef.current?.id === remoteJid) {
                    setMessages([])
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, []) // Only subscribe once — selectedChat accessed via ref

    // Load chats
    useEffect(() => {
        async function loadChats() {
            try {
                const res = await fetch("/api/whatsapp?action=chats", { cache: "no-store" })
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
            // Fetch messages
            const res = await fetch(`/api/whatsapp?action=messages&jid=${encodeURIComponent(chat.id)}`, { cache: "no-store" })
            const data = await res.json()
            if (Array.isArray(data)) setMessages(data)

            // Lazy load high-res avatar if not already cached
            if (!chat.profilePicUrl) {
                fetch(`/api/whatsapp/avatar?jid=${encodeURIComponent(chat.id)}`, { cache: "no-store" })
                    .then(r => r.json())
                    .then(data => {
                        if (data.profilePictureUrl) {
                            setSelectedChat(prev => prev ? { ...prev, profilePicUrl: data.profilePictureUrl } : prev)
                            setChats(prev => prev.map(c => c.id === chat.id ? { ...c, profilePicUrl: data.profilePictureUrl } : c))
                        }
                    })
                    .catch(console.error)
            }

            // Clear unread count locally and sync horizontally with WhatsApp
            if (chat.unread > 0) {
                fetch("/api/whatsapp/read", {
                    method: "POST",
                    body: JSON.stringify({ remoteJid: chat.id })
                }).catch(console.error)

                setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c))
            }
        } catch (err) {
            console.error("Erro ao carregar mensagens:", err)
        } finally {
            setLoadingMessages(false)
        }
    }, [])

    useEffect(() => {
        if (selectedChat) loadMessages(selectedChat)
    }, [selectedChat, loadMessages])

    // Load conversation metadata (agent assignment) when chat changes
    useEffect(() => {
        if (!selectedChat) { setConversationId(null); setAssignedAgentId(null); setConversationLabels([]); return }
        fetch(`/api/whatsapp?action=conversation&jid=${encodeURIComponent(selectedChat.id)}`, { cache: 'no-store' })
            .then(r => r.json())
            .then((data: any) => {
                if (data?.id) {
                    setConversationId(data.id)
                    setAssignedAgentId(data.agentId || null)
                    setAiEnabled(data.aiEnabled ?? true)
                } else {
                    setConversationId(null)
                }
            })
            .catch(() => { setConversationId(null) })
    }, [selectedChat?.id])

    // Load labels when conversationId is available (separate effect for reliability)
    useEffect(() => {
        if (!conversationId) { setConversationLabels([]); return }
        fetch(`/api/conversations/${conversationId}/labels`, { cache: 'no-store' })
            .then(r => r.json())
            .then(labels => { if (Array.isArray(labels)) setConversationLabels(labels); else setConversationLabels([]) })
            .catch(() => setConversationLabels([]))
    }, [conversationId])

    // Add label to conversation
    const addLabelToConversation = async (labelId: string) => {
        if (!conversationId || !selectedChat) return
        const label = allLabels.find(l => l.id === labelId)
        if (!label || conversationLabels.some(l => l.id === labelId)) return
        setConversationLabels(prev => [...prev, label])
        // Also update the global map so the chat list badge updates immediately
        setChatLabelsMap(prev => ({
            ...prev,
            [selectedChat.id]: [...(prev[selectedChat.id] || []), label]
        }))
        setShowLabelDropdown(false)
        try {
            await fetch(`/api/conversations/${conversationId}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labelId })
            })
        } catch {
            setConversationLabels(prev => prev.filter(l => l.id !== labelId))
            setChatLabelsMap(prev => ({
                ...prev,
                [selectedChat.id]: (prev[selectedChat.id] || []).filter(l => l.id !== labelId)
            }))
        }
    }

    // Remove label from conversation
    const removeLabelFromConversation = async (labelId: string) => {
        if (!conversationId || !selectedChat) return
        setConversationLabels(prev => prev.filter(l => l.id !== labelId))
        // Also update the global map
        setChatLabelsMap(prev => ({
            ...prev,
            [selectedChat.id]: (prev[selectedChat.id] || []).filter(l => l.id !== labelId)
        }))
        try {
            await fetch(`/api/conversations/${conversationId}/labels`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labelId })
            })
        } catch { /* revert handled by next load */ }
    }

    // Auto-scroll to bottom of messages only
    useEffect(() => {
        const el = messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages])

    // Reset conversation memory
    async function handleResetMemory(conversationId: string) {
        if (!confirm('Limpar a memória do bot nessa conversa? O histórico será apagado e o bot começará do zero.')) return
        try {
            await fetch(`/api/conversations/${conversationId}/reset`, { method: 'POST' })
            setMessages([])
        } catch (err) {
            console.error('Erro ao limpar memória:', err)
        }
    }

    // Send message
    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault()
        if (!messageInput.trim() || !selectedChat || sendingMessage) return

        const text = messageInput.trim()
        setMessageInput("")

        // /reset command — clears bot memory without sending a WhatsApp message
        if (text.toLowerCase() === '/reset' && conversationId) {
            await handleResetMemory(conversationId)
            return
        }

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

    // Start new conversation
    async function handleStartNewChat() {
        const phone = newChatPhone.replace(/\D/g, '')
        if (!phone || phone.length < 10 || !newChatMessage.trim()) return

        setSendingNewChat(true)
        try {
            const number = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
            await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number, text: newChatMessage.trim() })
            })

            setShowNewChat(false)
            setNewChatPhone('')
            setNewChatMessage('')

            // Refresh chat list after a short delay to let the message arrive
            setTimeout(async () => {
                try {
                    const res = await fetch('/api/whatsapp?action=chats', { cache: 'no-store' })
                    const data = await res.json()
                    if (Array.isArray(data)) setChats(data)
                } catch { }
            }, 1500)
        } catch (err) {
            console.error('Erro ao iniciar conversa:', err)
            alert('Erro ao enviar mensagem. Verifique o número.')
        } finally {
            setSendingNewChat(false)
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
            {/* New Conversation Modal */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewChat(false)}>
                    <div className="apple-glass-panel rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <MessageSquarePlus className="w-5 h-5 text-blue-400" />
                                Nova Conversa
                            </h2>
                            <button onClick={() => setShowNewChat(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Número do WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <Input
                                        value={newChatPhone}
                                        onChange={(e) => setNewChatPhone(e.target.value)}
                                        placeholder="5511999998888"
                                        className="pl-10 h-11 bg-white/5 border-white/10 rounded-xl text-sm"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-white/30">Código do país + DDD + número (sem espaço ou traço)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Mensagem Inicial</label>
                                <textarea
                                    value={newChatMessage}
                                    onChange={(e) => setNewChatMessage(e.target.value)}
                                    placeholder="Olá! Tudo bem?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowNewChat(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleStartNewChat}
                                disabled={sendingNewChat || !newChatPhone.replace(/\D/g, '') || newChatPhone.replace(/\D/g, '').length < 10 || !newChatMessage.trim()}
                                className="btn-primary px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-2"
                            >
                                {sendingNewChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conversation List */}
            <div className="w-[340px] apple-glass-heavy border-r border-white/10 flex flex-col h-full shrink-0 z-10 shadow-xl">
                <div className="p-4 border-b border-white/[0.08]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold tracking-tight text-white/90">WhatsApp</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                                title="Nova conversa"
                            >
                                <MessageSquarePlus className="w-4 h-4" />
                            </button>
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-sm shadow-emerald-500/10 uppercase tracking-widest px-2">
                                ● Conectado
                            </Badge>
                        </div>
                    </div>
                    <div className="relative mb-4">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            placeholder="Buscar conversas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:ring-blue-500/50 focus:border-blue-500/50 shadow-inner hover:bg-white/10 transition-colors"
                        />
                    </div>
                    {/* Filter tabs */}
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                        <button onClick={() => setFilter("all")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-semibold", filter === "all" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]")}>
                            Todas ({chats.length})
                        </button>
                        <button onClick={() => setFilter("personal")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-semibold", filter === "personal" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]")}>
                            Pessoais ({personalCount})
                        </button>
                        <button onClick={() => setFilter("groups")} className={cn("flex-1 text-[11px] py-1.5 rounded-lg transition-all font-semibold", filter === "groups" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]")}>
                            Grupos ({groupCount})
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {loadingChats ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-20 text-white/40 text-sm font-medium">
                            Nenhuma conversa encontrada
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-300 group",
                                        selectedChat?.id === chat.id
                                            ? "apple-glass-panel border-white/20 shadow-lg"
                                            : "hover:bg-white/[0.06] border border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "w-11 h-11 rounded-full flex items-center justify-center border border-white/20 shrink-0 shadow-inner group-hover:scale-105 transition-transform",
                                        chat.isGroup
                                            ? "bg-gradient-to-br from-violet-500/40 to-purple-500/40"
                                            : "bg-gradient-to-br from-blue-500/40 to-violet-500/40"
                                    )}>
                                        {chat.profilePicUrl ? (
                                            <img src={chat.profilePicUrl} alt={chat.name} className="w-full h-full object-cover rounded-full" />
                                        ) : chat.isGroup ? (
                                            <Users className="w-5 h-5 text-white/90" />
                                        ) : (
                                            <span className="text-sm font-bold text-white/90">
                                                {getInitials(chat.name)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-sm font-semibold text-white/90 truncate">{chat.name}</span>
                                            <span className="text-[10px] font-medium text-white/40 shrink-0">
                                                {formatTime(chat.lastActivity)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/50 truncate font-medium">{chat.lastMessage || chat.phoneFormatted || `+${chat.phone}`}</p>
                                        {/* Label badges — always visible for any chat that has labels */}
                                        {(chatLabelsMap[chat.id] || []).length > 0 && (
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {(chatLabelsMap[chat.id] || []).slice(0, 3).map(label => (
                                                    <span key={label.id} className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${label.color}20`, color: label.color }}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                                                        {label.name}
                                                    </span>
                                                ))}
                                                {(chatLabelsMap[chat.id] || []).length > 3 && (
                                                    <span className="text-[9px] font-bold text-white/40">+{(chatLabelsMap[chat.id] || []).length - 3}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {chat.unread > 0 && (
                                        <Badge className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center bg-blue-500 border border-blue-400/50 shadow-md shadow-blue-500/20 text-white shrink-0 rounded-full font-bold">
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
                <div className="flex-1 flex flex-col min-w-0 relative z-0">
                    {/* Chat Header */}
                    <div className="h-16 px-6 apple-glass-heavy border-b border-white/[0.08] flex items-center justify-between shrink-0 shadow-sm relative z-20">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border border-white/20 shadow-inner",
                                selectedChat.isGroup
                                    ? "bg-gradient-to-br from-violet-500/40 to-purple-500/40"
                                    : "bg-gradient-to-br from-blue-500/40 to-violet-500/40"
                            )}>
                                {selectedChat.profilePicUrl ? (
                                    <img src={selectedChat.profilePicUrl} alt={selectedChat.name} className="w-full h-full object-cover rounded-full" />
                                ) : selectedChat.isGroup ? (
                                    <Users className="w-5 h-5 text-white/90" />
                                ) : (
                                    <span className="text-sm font-bold text-white/90">
                                        {getInitials(selectedChat.name)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold tracking-tight text-white/90">{selectedChat.name}</h3>
                                <p className="text-[11px] font-medium text-white/50">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <Phone className="w-[18px] h-[18px]" />
                            </button>
                            <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <Video className="w-[18px] h-[18px]" />
                            </button>
                            <div className="w-px h-5 bg-white/10 mx-1" />
                            <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <Bot className="w-[18px] h-[18px]" />
                            </button>
                            {conversationId && (
                                <button
                                    title="Limpar memória do bot"
                                    onClick={() => handleResetMemory(conversationId)}
                                    className="p-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 className="w-[18px] h-[18px]" />
                                </button>
                            )}
                            <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <MoreVertical className="w-[18px] h-[18px]" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative z-10 masked-overflow pb-4">
                        <div className="p-6 max-w-4xl mx-auto">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 animate-fade-in flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
                                        <MessageSquare className="w-8 h-8 text-white/20" />
                                    </div>
                                    <p className="text-sm font-semibold text-white/50">Nenhuma mensagem nesta conversa</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
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
                                                    "max-w-[80%] px-5 py-3 text-[15px] leading-relaxed relative",
                                                    msg.fromMe
                                                        ? "chat-bubble-sent font-medium text-white/95 shadow-xl shadow-blue-500/10"
                                                        : "chat-bubble-received font-medium text-white/90 shadow-lg"
                                                )}
                                            >
                                                {/* Group sender name and avatar */}
                                                {selectedChat.isGroup && !msg.fromMe && msg.senderName && (
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        {msg.senderProfilePicUrl ? (
                                                            <img src={msg.senderProfilePicUrl} alt={msg.senderName} className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                                                                <span className="text-[8px] font-bold text-violet-400">{msg.senderName[0].toUpperCase()}</span>
                                                            </div>
                                                        )}
                                                        <p className="text-[11px] font-bold text-violet-400 tracking-wider uppercase truncate">{msg.senderName}</p>
                                                    </div>
                                                )}

                                                {/* Media content */}
                                                {msg.hasMedia ? (
                                                    <MediaContent msg={msg} onImageClick={setLightboxUrl} />
                                                ) : (
                                                    msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                )}

                                                {/* Text-only without media */}
                                                {!msg.hasMedia && !msg.content && msg.type === "sticker" && (
                                                    <p className="text-xs font-semibold opacity-50 italic">🏷️ Figurinha Oculta</p>
                                                )}

                                                <div
                                                    className={cn(
                                                        "flex items-center gap-1 justify-end mt-1.5",
                                                        msg.fromMe ? "text-white/60" : "text-white/40"
                                                    )}
                                                >
                                                    <span className="text-[9px] font-bold tracking-widest uppercase">{formatMessageTime(msg.timestamp)}</span>
                                                    {msg.fromMe && (
                                                        <span className={cn(
                                                            "text-[11px] font-bold leading-none",
                                                            msg.isRead ? "text-blue-400" : "text-white/40"
                                                        )}>
                                                            {msg.isRead ? "✓✓" : "✓"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="p-4 px-6 apple-glass-heavy border-t border-white/[0.08] shrink-0 relative z-20">
                        <div className="flex items-center gap-3 max-w-4xl mx-auto">
                            <button type="button" className="p-3 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                <Smile className="w-5 h-5" />
                            </button>
                            <button type="button" className="p-3 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <Input
                                placeholder="Mensagem..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                className="flex-1 h-12 px-5 bg-white/5 border-white/10 text-[15px] font-medium text-white/90 placeholder:text-white/30 focus:ring-blue-500/50 focus:border-blue-500/50 rounded-full shadow-inner tracking-wide"
                            />
                            <button
                                type="submit"
                                disabled={sendingMessage || !messageInput.trim()}
                                className="btn-primary w-12 h-12 min-w-[3rem] h-full rounded-full flex items-center justify-center disabled:opacity-50 group hover:shadow-xl hover:shadow-blue-500/20"
                            >
                                {sendingMessage ? (
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 text-white transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* No Chat Selected */
                <div className="flex-1 flex items-center justify-center relative z-0">
                    <div className="text-center animate-fade-in flex flex-col items-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center border border-white/10 shadow-inner">
                                <MessageSquare className="w-8 h-8 text-white/60" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-white/90 mb-2">Workspace Vazio</h3>
                        <p className="text-sm font-medium text-white/50 max-w-xs mb-6">
                            Selecione uma conversa do lado esquerdo para começar a interagir.
                        </p>
                        <button
                            onClick={() => setShowNewChat(true)}
                            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-violet-500/20 border border-blue-500/20 hover:from-blue-500/30 hover:to-violet-500/30 hover:border-blue-500/30 transition-all duration-300 group"
                        >
                            <MessageSquarePlus className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                            <span className="text-sm font-semibold text-white/80 group-hover:text-white">Nova Conversa</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Contact Panel */}
            {selectedChat && (
                <div className="w-[320px] apple-glass-heavy border-l border-white/10 p-6 hidden xl:block shrink-0 overflow-y-auto shadow-xl z-20">
                    <div className="flex flex-col items-center text-center mb-8 pt-6">
                        <div className={cn(
                            "w-24 h-24 rounded-[2rem] flex items-center justify-center border border-white/20 mb-4 shadow-2xl shadow-blue-500/10",
                            selectedChat.isGroup
                                ? "bg-gradient-to-br from-violet-500/40 to-purple-500/40"
                                : "bg-gradient-to-br from-blue-500/40 to-violet-500/40"
                        )}>
                            {selectedChat.profilePicUrl ? (
                                <img src={selectedChat.profilePicUrl} alt={selectedChat.name} className="w-full h-full object-cover rounded-[2rem]" />
                            ) : selectedChat.isGroup ? (
                                <Users className="w-10 h-10 text-white/90" />
                            ) : (
                                <span className="text-3xl font-bold text-white/90">
                                    {getInitials(selectedChat.name)}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-white/90 px-4">{selectedChat.name}</h3>
                        <p className="text-[13px] font-medium text-white/50 mt-1.5">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="apple-glass-panel rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">{selectedChat.isGroup ? "Canal de Comunicação" : "Canal"}</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                    {selectedChat.isGroup ? (
                                        <Users className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-white/80">
                                    {selectedChat.isGroup ? "Grupo de WhatsApp" : "Linha de WhatsApp"}
                                </span>
                            </div>
                        </div>
                        {!selectedChat.isGroup && (
                            <div className="apple-glass-panel rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Telefone Registrado</p>
                                <p className="text-sm font-semibold text-white/80">{selectedChat.phoneFormatted || `+${selectedChat.phone}`}</p>
                            </div>
                        )}
                        <div className="apple-glass-panel rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Assistente Atribuído</p>
                            <select
                                className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500/50 transition-colors cursor-pointer disabled:opacity-50"
                                value={assignedAgentId || ""}
                                disabled={assigningAgent || !conversationId}
                                onChange={async (e) => {
                                    const newAgentId = e.target.value || null
                                    if (!conversationId) return
                                    setAssigningAgent(true)
                                    setAssignedAgentId(newAgentId)
                                    try {
                                        await fetch(`/api/conversations/${conversationId}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                agentId: newAgentId,
                                                aiEnabled: !!newAgentId
                                            })
                                        })
                                        setAiEnabled(!!newAgentId)
                                    } catch (err) {
                                        console.error('Failed to assign agent', err)
                                    } finally {
                                        setAssigningAgent(false)
                                    }
                                }}
                            >
                                <option value="">👤 Atendimento Humano</option>
                                {agents.map(a => (
                                    <option key={a.id} value={a.id}>🤖 {a.name}</option>
                                ))}
                            </select>

                            {/* AI Enabled Toggle — only visible when an agent is assigned */}
                            {assignedAgentId && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                                    <span className="text-xs font-medium text-white/50">Respostas automáticas</span>
                                    <button
                                        onClick={async () => {
                                            if (!conversationId) return
                                            const newVal = !aiEnabled
                                            setAiEnabled(newVal)
                                            await fetch(`/api/conversations/${conversationId}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ aiEnabled: newVal })
                                            }).catch(console.error)
                                        }}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${aiEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${aiEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Labels Section */}
                        <div className="apple-glass-panel rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Etiquetas</p>
                                <button
                                    onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Applied Labels */}
                            {conversationLabels.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {conversationLabels.map(label => (
                                        <span
                                            key={label.id}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg group/label cursor-default transition-all hover:scale-105"
                                            style={{ backgroundColor: `${label.color}20`, color: label.color, border: `1px solid ${label.color}30` }}
                                        >
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                            {label.name}
                                            <button
                                                onClick={() => removeLabelFromConversation(label.id)}
                                                className="ml-0.5 opacity-0 group-hover/label:opacity-100 transition-opacity hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-white/30 mb-2">Nenhuma etiqueta aplicada</p>
                            )}

                            {/* Add Label Dropdown */}
                            {showLabelDropdown && (
                                <div className="mt-2 p-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-2xl max-h-[200px] overflow-y-auto space-y-0.5">
                                    {allLabels.filter(l => !conversationLabels.some(cl => cl.id === l.id)).length === 0 ? (
                                        <p className="text-xs text-white/30 text-center py-2">Todas aplicadas</p>
                                    ) : (
                                        allLabels.filter(l => !conversationLabels.some(cl => cl.id === l.id)).map(label => (
                                            <button
                                                key={label.id}
                                                onClick={() => addLabelToConversation(label.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                                            >
                                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                                <span className="text-xs font-semibold text-white/80">{label.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
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
