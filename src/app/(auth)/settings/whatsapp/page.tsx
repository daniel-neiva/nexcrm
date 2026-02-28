"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Plus,
    MoreVertical,
    RefreshCw,
    Trash2,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    MessageSquare,
    QrCode
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
export default function WhatsAppSettingsPage() {
    const [inboxes, setInboxes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [newInstanceName, setNewInstanceName] = useState("")
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    const fetchInboxes = async () => {
        try {
            const res = await fetch("/api/inboxes")
            const data = await res.json()
            if (Array.isArray(data)) setInboxes(data)
        } catch (error) {
            console.error("Erro ao carregar inboxes:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const supabase = createClient()
        fetchInboxes()

        const channel = supabase
            .channel('whatsapp_updates')
            .on('broadcast', { event: 'inbox_status_updated' }, () => {
                console.log("[Settings] Status updated, refetching...")
                fetchInboxes()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleCreateInstance = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch("/api/whatsapp/instances", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, instanceName: newInstanceName })
            })
            const data = await res.json()
            if (res.ok) {
                setSuccess("Instância criada com sucesso! Redirecionando...")
                setNewName("")
                setNewInstanceName("")
                fetchInboxes()
                setTimeout(() => {
                    setIsCreateOpen(false)
                    setSuccess(null)
                    router.push(`/settings/whatsapp/${data.id}`)
                }, 1500)
            } else {
                setError(data.error || "Erro ao criar instância")
                console.error("Erro ao criar:", data.error)
            }
        } catch (error) {
            console.error("Erro na comunicação:", error)
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">WhatsApp</h1>
                    <p className="text-white/60">Gerencie múltiplas contas do WhatsApp no seu NexCRM.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 rounded-2xl shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4" />
                            Nova Caixa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="apple-glass-heavy border-white/10 text-white sm:max-w-[425px]">
                        <form onSubmit={handleCreateInstance}>
                            <DialogHeader>
                                <DialogTitle>Adicionar Nova Caixa</DialogTitle>
                                <DialogDescription className="text-white/60">
                                    Crie uma nova instância para conectar um número de WhatsApp.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Nome da Caixa (Ex: Comercial)</Label>
                                    <Input
                                        id="name"
                                        value={newName}
                                        onChange={(e) => {
                                            setNewName(e.target.value)
                                            if (!newInstanceName) setNewInstanceName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                                        }}
                                        className="bg-white/5 border-white/10 rounded-xl focus:ring-blue-500"
                                        placeholder="Ex: Comercial WhatsApp"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instance" className="text-sm font-medium">Nome Interno (Único)</Label>
                                    <Input
                                        id="instance"
                                        value={newInstanceName}
                                        onChange={(e) => setNewInstanceName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="bg-white/5 border-white/10 rounded-xl focus:ring-blue-500"
                                        placeholder="ex: comercial-nexcrm"
                                        required
                                    />
                                </div>
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-xs flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 shrink-0" />
                                        {success}
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl">
                                    {creating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : "Criar Instância"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-[250px] w-full apple-glass-panel rounded-3xl animate-pulse" />
                    ))
                ) : inboxes.length === 0 ? (
                    <Card className="col-span-full apple-glass-panel border-white/10 backdrop-blur-xl bg-white/5">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                <MessageSquare className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Sem Caixas Conectadas</h3>
                            <p className="text-white/40 max-w-xs mb-8">Comece conectando sua primeira conta do WhatsApp para gerenciar conversas.</p>
                            <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-white/10 hover:bg-white/5 text-white rounded-xl">
                                Conectar Primeira Conta
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    inboxes.map((inbox) => (
                        <Card key={inbox.id} className="apple-glass-panel border-white/10 backdrop-blur-xl bg-white/5 overflow-hidden group hover:bg-white/[0.08] transition-all duration-300">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
                                            {inbox.avatarUrl ? (
                                                <img src={inbox.avatarUrl} alt={inbox.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <MessageSquare className="w-6 h-6 text-white/40" />
                                            )}
                                        </div>
                                        <div className={cn(
                                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#09090b]",
                                            inbox.status === 'CONNECTED' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-red-500"
                                        )} />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 text-white/40 hover:text-white rounded-lg">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="apple-glass-panel border-white/10 text-white">
                                            <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                                                <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar Instância
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="focus:bg-white/10 text-red-400 focus:text-red-400 cursor-pointer">
                                                <Trash2 className="w-4 h-4 mr-2" /> Excluir Caixa
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-white text-lg">{inbox.name}</CardTitle>
                                    <CardDescription className="text-white/40 text-sm mt-1 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                                        {inbox.instanceName}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-xs px-1">
                                    <span className="text-white/30">Status</span>
                                    <Badge variant="outline" className={cn(
                                        "border-0 rounded-full px-3 py-0.5 font-bold uppercase tracking-wider text-[10px]",
                                        inbox.status === 'CONNECTED'
                                            ? "bg-green-500/10 text-green-400"
                                            : "bg-red-500/10 text-red-400"
                                    )}>
                                        {inbox.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs px-1">
                                    <span className="text-white/30">Número</span>
                                    <span className="text-white/70 font-mono">{inbox.phoneNumber || "Aguardando..."}</span>
                                </div>

                                <div className="pt-2 flex gap-2">
                                    {inbox.status === 'CONNECTED' ? (
                                        <Button
                                            onClick={() => router.push(`/chat?inbox=${inbox.id}`)}
                                            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-2" /> Ver Conversas
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => router.push(`/settings/whatsapp/${inbox.id}`)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                                        >
                                            <QrCode className="w-3 h-3 mr-2" /> CONECTAR AGORA
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="apple-glass-panel p-6 border-white/10 rounded-3xl flex items-start gap-4 bg-blue-500/5 border border-blue-500/20">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1">Dica Pro</h4>
                    <p className="text-sm text-white/60 leading-relaxed">
                        Mantenha suas instâncias conectadas para que os Agentres de IA (como a Maya) possam responder seus leads instantaneamente 24/7.
                        Você pode conectar múltiplos números para separar departamentos como Comercial, Suporte e Financeiro.
                    </p>
                </div>
            </div>
        </div>
    )
}
