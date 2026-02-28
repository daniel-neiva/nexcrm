"use client"

import { useState, useEffect } from "react"
import {
    ArrowLeft, Bot, Save, Loader2, Trash2
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"

export default function EditAIAgentPage() {
    const router = useRouter()
    const params = useParams()
    const agentId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        roleDescription: "",
        voiceType: "FEMALE",
        messageGrouping: true,
        groupingDelay: 15,
        humanHandoffRules: "",
        timeBasedRouting: false,
        companyName: "",
        companyUrl: "",
        companyDescription: "",
        communicationStyle: "PROFESSIONAL",
        flow: "QUALIFICATION",
        prompt: "",
        isActive: true,
    })

    useEffect(() => {
        async function loadAgent() {
            try {
                const res = await fetch(`/api/agents/${agentId}`)
                if (!res.ok) throw new Error("Agent not found")
                const data = await res.json()
                setFormData({
                    name: data.name || "",
                    roleDescription: data.roleDescription || "",
                    voiceType: data.voiceType || "FEMALE",
                    messageGrouping: data.messageGrouping ?? true,
                    groupingDelay: data.groupingDelay || 15,
                    humanHandoffRules: data.humanHandoffRules || "",
                    timeBasedRouting: data.timeBasedRouting ?? false,
                    companyName: data.companyName || "",
                    companyUrl: data.companyUrl || "",
                    companyDescription: data.companyDescription || "",
                    communicationStyle: data.communicationStyle || "PROFESSIONAL",
                    flow: data.flow || "QUALIFICATION",
                    prompt: data.prompt || "",
                    isActive: data.isActive ?? true,
                })
            } catch (err) {
                console.error(err)
                alert("Agente não encontrado.")
                router.push("/agents")
            } finally {
                setIsLoading(false)
            }
        }
        loadAgent()
    }, [agentId, router])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch(`/api/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                router.push("/agents")
                router.refresh()
            } else {
                const err = await res.json()
                alert(err.error || "Erro ao salvar agente")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir este agente permanentemente?")) return
        try {
            await fetch(`/api/agents/${agentId}`, { method: "DELETE" })
            router.push("/agents")
            router.refresh()
        } catch (err) {
            console.error(err)
        }
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    const styles = [
        { id: "PROFESSIONAL", label: "Profissional", desc: "Formal, corporativo e focado em objetividade." },
        { id: "FRIENDLY", label: "Amigável", desc: "Casual, acolhedor e usa emojis moderadamente." },
        { id: "CONSULTATIVE", label: "Consultivo", desc: "Focado em orientação, detalhista e autoritário." },
    ]

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 p-6 lg:px-10 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/agents" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white/90">Editar {formData.name}</h1>
                        <p className="text-xs font-medium text-[#94A3B8]">Altere as configurações do agente</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleDelete} className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="btn-primary rounded-xl px-6 h-10 font-bold">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
                    </Button>
                </div>
            </div>

            <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8 animate-slide-up">

                {/* Basic Info */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-1">Informações Básicas</h2>
                    <p className="text-xs text-[#94A3B8] mb-4">Identidade do agente.</p>
                    <div className="apple-glass-panel p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Nome</label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border-white/10 rounded-xl h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Voz</label>
                                <div className="flex gap-2">
                                    {["MALE", "FEMALE"].map((type) => (
                                        <button key={type}
                                            onClick={() => setFormData({ ...formData, voiceType: type })}
                                            className={cn("flex-1 h-11 rounded-xl border text-sm font-bold transition-all", formData.voiceType === type ? "bg-blue-500/20 border-blue-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10")}
                                        >{type === "MALE" ? "Masculina" : "Feminina"}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Função / Descrição</label>
                            <Textarea value={formData.roleDescription} onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })} className="bg-white/5 border-white/10 rounded-xl min-h-[80px]" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div>
                                <span className="text-sm font-bold text-white/90">Ativo</span>
                                <p className="text-xs text-[#64748B]">Liga/desliga o agente</p>
                            </div>
                            <Switch checked={formData.isActive} onCheckedChange={(val) => setFormData({ ...formData, isActive: val })} />
                        </div>
                    </div>
                </section>

                {/* Company */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-1">Dados da Empresa</h2>
                    <p className="text-xs text-[#94A3B8] mb-4">Contexto para a IA.</p>
                    <div className="apple-glass-panel p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Empresa</label>
                                <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="bg-white/5 border-white/10 rounded-xl h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Site</label>
                                <Input value={formData.companyUrl || ""} onChange={(e) => setFormData({ ...formData, companyUrl: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10 rounded-xl h-11" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Descrição do Negócio</label>
                            <Textarea value={formData.companyDescription || ""} onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })} className="bg-white/5 border-white/10 rounded-xl min-h-[80px]" />
                        </div>
                    </div>
                </section>

                {/* Personality */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-1">Personalidade</h2>
                    <p className="text-xs text-[#94A3B8] mb-4">Como o bot deve soar.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {styles.map((style) => (
                            <button key={style.id}
                                onClick={() => setFormData({ ...formData, communicationStyle: style.id })}
                                className={cn("apple-glass-panel p-5 flex items-center gap-4 text-left transition-all duration-300", formData.communicationStyle === style.id ? "border-white/20 bg-white/10" : "border-white/5 hover:border-white/10")}
                            >
                                <div className={cn("w-3 h-3 rounded-full shrink-0", formData.communicationStyle === style.id ? "bg-blue-500" : "bg-white/10")} />
                                <div>
                                    <span className="text-sm font-bold text-white/90">{style.label}</span>
                                    <p className="text-xs text-[#64748B] mt-0.5">{style.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Prompt */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-1">Prompt Base</h2>
                    <p className="text-xs text-[#94A3B8] mb-4">Instrução-mestre do comportamento da IA.</p>
                    <div className="apple-glass-panel p-6">
                        <Textarea value={formData.prompt} onChange={(e) => setFormData({ ...formData, prompt: e.target.value })} className="bg-white/5 border-white/10 rounded-xl min-h-[160px] font-mono text-xs" placeholder="Aja como..." />
                    </div>
                </section>

                {/* Behavior */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-1">Comportamento</h2>
                    <p className="text-xs text-[#94A3B8] mb-4">Regras de transbordo e timing.</p>
                    <div className="apple-glass-panel p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Regras de Transbordo Humano</label>
                            <Textarea value={formData.humanHandoffRules} onChange={(e) => setFormData({ ...formData, humanHandoffRules: e.target.value })} className="bg-white/5 border-white/10 rounded-xl min-h-[60px]" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div>
                                <span className="text-sm font-bold text-white/90">Agrupar Mensagens</span>
                                <p className="text-xs text-[#64748B]">Consolidar msgs antes de responder</p>
                            </div>
                            <Switch checked={formData.messageGrouping} onCheckedChange={(val) => setFormData({ ...formData, messageGrouping: val })} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div>
                                <span className="text-sm font-bold text-white/90">Roteamento por Horário</span>
                                <p className="text-xs text-[#64748B]">Fluxos distintos para horário comercial</p>
                            </div>
                            <Switch checked={formData.timeBasedRouting} onCheckedChange={(val) => setFormData({ ...formData, timeBasedRouting: val })} />
                        </div>
                    </div>
                </section>

                {/* Bottom save */}
                <div className="flex items-center justify-end gap-3 pt-4 pb-10">
                    <Button variant="ghost" onClick={() => router.push("/agents")} className="text-white/60">Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="btn-primary rounded-xl px-8 h-11 font-bold">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
