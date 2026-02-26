"use client"

import { useState, useEffect } from "react"
import {
    ArrowLeft,
    Bot,
    ChevronRight,
    ChevronLeft,
    Check,
    MessageSquare,
    Clock,
    Building2,
    BookOpen,
    Tag,
    Users,
    UserPlus,
    Sparkles,
    Zap,
    Plus,
    Trash2,
    Save,
    MapPin,
    Send,
    Loader2
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

const STEPS = [
    { id: 1, title: "Informações Básicas", icon: Bot },
    { id: 2, title: "Redirecionamento", icon: Clock },
    { id: 3, title: "Dados da Empresa", icon: Building2 },
    { id: 4, title: "Base de Conhecimento", icon: BookOpen },
    { id: 5, title: "Etiquetas", icon: Tag },
    { id: 6, title: "Atribuição", icon: Users },
    { id: 7, title: "Atributos", icon: UserPlus },
    { id: 8, title: "Personalidade", icon: Sparkles },
    { id: 9, title: "Fluxo", icon: Zap },
]

export default function CreateAIAgentPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        // Step 1
        name: "",
        roleDescription: "",
        voiceType: "FEMALE",
        messageGrouping: true,
        groupingDelay: 15,

        // Step 2
        humanHandoffRules: "",
        timeBasedRouting: false,

        // Step 3
        companyName: "",
        companyUrl: "",
        companyDescription: "",
        locations: [] as { street: string; city: string }[],

        // Step 4
        knowledgeData: [] as { tagName: string; content: string }[],

        // Step 5
        tags: [] as { name: string; context: string }[],

        // Step 6
        teams: [] as string[],
        randomAssignment: false,

        // Step 7
        attributes: [] as { fieldType: string; description: string; isRequired: boolean }[],

        // Step 8
        communicationStyle: "CONSULTATIVE", // PROFESSIONAL, FRIENDLY, CONSULTATIVE

        // Step 9
        flow: "QUALIFICATION", // QUALIFICATION, SCHEDULING
        prompt: "", // Base system prompt
    })

    // Chat Test State
    const [testChatMessages, setTestChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
    const [testMessage, setTestMessage] = useState("")
    const [isSendingTest, setIsSendingTest] = useState(false)
    const [tempAgentId, setTempAgentId] = useState<string | null>(null)

    const handleNext = () => {
        if (currentStep < 9) setCurrentStep(currentStep + 1)
    }

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1)
    }

    const handleSendTestMessage = async () => {
        if (!testMessage.trim() || isSendingTest) return

        const userMsg = testMessage
        setTestMessage("")
        setTestChatMessages(prev => [...prev, { role: "user", content: userMsg }])
        setIsSendingTest(true)

        try {
            // First time? Create a temporary agent or just use a dedicated test endpoint
            // For now, we'll save the agent first to get an ID if we want to test with real DB context
            // OR we can create a "dry-run" chat endpoint.
            // Let's assume we save a draft or just use a special test route.

            // To make it simple and functional NOW:
            const res = await fetch("/api/agents/test-draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    agentData: formData,
                    history: testChatMessages
                })
            })

            const data = await res.json()
            if (data.response) {
                setTestChatMessages(prev => [...prev, { role: "assistant", content: data.response }])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSendingTest(false)
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    // Simple prompt generation if empty
                    prompt: formData.prompt || `Aja como ${formData.name}, um ${formData.roleDescription}. Estilo: ${formData.communicationStyle}. Empresa: ${formData.companyName}.`
                })
            })

            if (res.ok) {
                router.push("/settings/ai-agents")
                router.refresh()
            } else {
                const err = await res.json()
                alert(err.error || "Erro ao criar agente")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 lg:px-10 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/settings/ai-agents" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white/90">Novo Agente IA</h1>
                        <p className="text-xs font-medium text-[#94A3B8]">Configuração assistida do seu chatbot</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest mr-2">
                        Passo {currentStep} de 9
                    </span>
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/settings/ai-agents")}
                        className="text-white/60 hover:text-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={currentStep === 9 ? handleSubmit : handleNext}
                        disabled={isSubmitting}
                        className="btn-primary rounded-xl px-6 h-10 font-bold"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : currentStep === 9 ? "Finalizar" : "Próximo"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Progress */}
                <div className="w-64 border-r border-white/5 bg-black/40 p-6 hidden lg:block overflow-y-auto">
                    <div className="space-y-1">
                        {STEPS.map((step) => {
                            const Icon = step.icon
                            const isCompleted = currentStep > step.id
                            const isActive = currentStep === step.id

                            return (
                                <button
                                    key={step.id}
                                    onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group text-left",
                                        isActive ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isActive ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" :
                                            isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/20"
                                    )}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-bold transition-colors",
                                        isActive ? "text-white" : isCompleted ? "text-white/60" : "text-white/20"
                                    )}>
                                        {step.title}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-gradient-to-br from-blue-500/5 to-violet-500/5">
                    <div className="max-w-2xl mx-auto animate-slide-up">
                        {currentStep === 1 && (
                            <Step1 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 2 && (
                            <Step2 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 3 && (
                            <Step3 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 4 && (
                            <Step4 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 5 && (
                            <Step5 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 6 && (
                            <Step6 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 7 && (
                            <Step7 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 8 && (
                            <Step8 formData={formData} setFormData={setFormData} />
                        )}
                        {currentStep === 9 && (
                            <Step9
                                formData={formData}
                                setFormData={setFormData}
                                testChatMessages={testChatMessages}
                                setTestChatMessages={setTestChatMessages}
                                testMessage={testMessage}
                                setTestMessage={setTestMessage}
                                isSendingTest={isSendingTest}
                                handleSendTestMessage={handleSendTestMessage}
                            />
                        )}

                        {/* Navigation Footer for Mobile/Small tablets */}
                        <div className="mt-12 flex items-center justify-between lg:hidden pt-8 border-t border-white/10">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className="text-white/60"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                            </Button>
                            <Button
                                onClick={currentStep === 9 ? handleSubmit : handleNext}
                                className="btn-primary"
                            >
                                {currentStep === 9 ? "Finalizar" : "Próximo"} <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Steps Components ---

function Step1({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Informações Básicas</h2>
                <p className="text-sm text-[#94A3B8]">Defina a identidade do seu agente de IA.</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Nome do Agente *</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Maya"
                        className="bg-white/5 border-white/10 rounded-2xl h-12"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Função do Agente *</label>
                    <Textarea
                        value={formData.roleDescription}
                        onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                        placeholder="Ex: Especialista em triagem comercial para imobiliárias..."
                        className="bg-white/5 border-white/10 rounded-2xl min-h-[120px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Tipo de Voz</label>
                        <div className="flex gap-2">
                            {["MALE", "FEMALE"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFormData({ ...formData, voiceType: type })}
                                    className={cn(
                                        "flex-1 h-12 rounded-xl border text-sm font-bold transition-all",
                                        formData.voiceType === type ? "bg-blue-500/20 border-blue-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    {type === "MALE" ? "Masculina" : "Feminina"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Agrupar Mensagens</label>
                        <div className="flex items-center gap-3 h-12 px-4 bg-white/5 border border-white/10 rounded-xl">
                            <Switch
                                checked={formData.messageGrouping}
                                onCheckedChange={(val) => setFormData({ ...formData, messageGrouping: val })}
                            />
                            <span className="text-xs font-medium text-white/60">Ativar consolidação</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Step2({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Redirecionamento</h2>
                <p className="text-sm text-[#94A3B8]">Defina quando a IA deve chamar um humano.</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Regras de Transbordo</label>
                    <Textarea
                        value={formData.humanHandoffRules}
                        onChange={(e) => setFormData({ ...formData, humanHandoffRules: e.target.value })}
                        placeholder="Ex: redirecione quando o cliente demonstrar irritação ou pedir falar com um advogado."
                        className="bg-white/5 border-white/10 rounded-2xl min-h-[120px]"
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-white/90">Mensagem por Horário</span>
                        <span className="text-xs text-[#64748B]">Habilitar fluxos distintos para horários comerciais</span>
                    </div>
                    <Switch
                        checked={formData.timeBasedRouting}
                        onCheckedChange={(val) => setFormData({ ...formData, timeBasedRouting: val })}
                    />
                </div>
            </div>
        </div>
    )
}

function Step3({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Dados da Empresa</h2>
                <p className="text-sm text-[#94A3B8]">A base para a IA saber o que ela representa.</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Nome da Empresa *</label>
                        <Input
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            placeholder="Ex: Advocacia Silva"
                            className="bg-white/5 border-white/10 rounded-2xl h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Site</label>
                        <Input
                            value={formData.companyUrl}
                            onChange={(e) => setFormData({ ...formData, companyUrl: e.target.value })}
                            placeholder="https://..."
                            className="bg-white/5 border-white/10 rounded-2xl h-12"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Descrição do Negócio</label>
                    <Textarea
                        value={formData.companyDescription}
                        onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                        placeholder="Fale sobre a história, valores e o que a empresa faz..."
                        className="bg-white/5 border-white/10 rounded-2xl min-h-[120px]"
                    />
                </div>

                <div className="pt-4 border-t border-white/5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 rounded-xl"
                        onClick={() => setFormData({ ...formData, locations: [...formData.locations, { street: "", city: "" }] })}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Localização
                    </Button>

                    <div className="mt-4 space-y-3">
                        {formData.locations.map((loc: any, i: number) => (
                            <div key={i} className="flex gap-3 animate-slide-up">
                                <div className="relative flex-1">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                                    <Input
                                        value={loc.street}
                                        onChange={(e) => {
                                            const newLocs = [...formData.locations]
                                            newLocs[i].street = e.target.value
                                            setFormData({ ...formData, locations: newLocs })
                                        }}
                                        placeholder="Rua, Número"
                                        className="pl-10 h-10 bg-white/5 border-white/10 text-xs"
                                    />
                                </div>
                                <Input
                                    value={loc.city}
                                    onChange={(e) => {
                                        const newLocs = [...formData.locations]
                                        newLocs[i].city = e.target.value
                                        setFormData({ ...formData, locations: newLocs })
                                    }}
                                    placeholder="Cidade/UF"
                                    className="w-32 h-10 bg-white/5 border-white/10 text-xs"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                                    onClick={() => {
                                        const newLocs = formData.locations.filter((_: any, idx: number) => idx !== i)
                                        setFormData({ ...formData, locations: newLocs })
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Step4({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Base de Conhecimento</h2>
                <p className="text-sm text-[#94A3B8]">Adicione informações complementares para treinar o robô.</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <Button
                    className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center justify-center gap-2"
                    onClick={() => setFormData({ ...formData, knowledgeData: [...formData.knowledgeData, { tagName: "", content: "" }] })}
                >
                    <Plus className="w-5 h-5" /> Adicionar Conhecimento
                </Button>

                <div className="space-y-4">
                    {formData.knowledgeData.map((k: any, i: number) => (
                        <div key={i} className="apple-glass-panel p-6 space-y-4 border-white/5 bg-white/[0.02] relative group">
                            <button
                                className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors"
                                onClick={() => {
                                    const newK = formData.knowledgeData.filter((_: any, idx: number) => idx !== i)
                                    setFormData({ ...formData, knowledgeData: newK })
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Título/Contexto</label>
                                <Input
                                    value={k.tagName}
                                    onChange={(e) => {
                                        const newK = [...formData.knowledgeData]
                                        newK[i].tagName = e.target.value
                                        setFormData({ ...formData, knowledgeData: newK })
                                    }}
                                    placeholder="Ex: Tabela de Preços, Postura, Observações..."
                                    className="bg-white/5 border-white/10 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Conteúdo Detalhado</label>
                                <Textarea
                                    value={k.content}
                                    onChange={(e) => {
                                        const newK = [...formData.knowledgeData]
                                        newK[i].content = e.target.value
                                        setFormData({ ...formData, knowledgeData: newK })
                                    }}
                                    placeholder="Descreva as informações que o bot deve consultar aqui..."
                                    className="bg-white/5 border-white/10 rounded-xl min-h-[100px]"
                                />
                            </div>
                        </div>
                    ))}

                    {formData.knowledgeData.length === 0 && (
                        <div className="py-12 text-center text-sm font-medium text-white/20 italic">
                            Nenhuma informação complementar adicionada.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Step5({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Etiquetas Inteligentes</h2>
                <p className="text-sm text-[#94A3B8]">Ensine o bot a classificar as conversas no CRM.</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <Button
                    className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center justify-center gap-2"
                    onClick={() => setFormData({ ...formData, tags: [...formData.tags, { name: "", context: "" }] })}
                >
                    <Plus className="w-5 h-5" /> Nova Regra de Etiqueta
                </Button>

                <div className="space-y-4">
                    {formData.tags.map((tag: any, i: number) => (
                        <div key={i} className="apple-glass-panel p-6 flex gap-4 border-white/5 bg-white/[0.02]">
                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Nome da Etiqueta</label>
                                    <Input
                                        value={tag.name}
                                        onChange={(e) => {
                                            const newTags = [...formData.tags]
                                            newTags[i].name = e.target.value
                                            setFormData({ ...formData, tags: newTags })
                                        }}
                                        placeholder="Ex: Lead Quente"
                                        className="bg-white/5 border-white/10 rounded-xl h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Contexto de Uso (Instrução)</label>
                                    <Input
                                        value={tag.context}
                                        onChange={(e) => {
                                            const newTags = [...formData.tags]
                                            newTags[i].context = e.target.value
                                            setFormData({ ...formData, tags: newTags })
                                        }}
                                        placeholder="Ex: Aplique quando o cliente demonstrar intenção de compra imediata."
                                        className="bg-white/5 border-white/10 rounded-xl h-10"
                                    />
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="mt-6 text-red-400/50 hover:text-red-400"
                                onClick={() => {
                                    const newTags = formData.tags.filter((_: any, idx: number) => idx !== i)
                                    setFormData({ ...formData, tags: newTags })
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Step6({ formData, setFormData }: any) {
    const teamsList = ["Vendas", "Suporte", "Operacional", "Financeiro"]

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Atribuição de Times</h2>
                <p className="text-sm text-[#94A3B8]">Para qual departamento o lead vai após a triagem?</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-8">
                <div className="space-y-4">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Selecione os Times Alvo</label>
                    <div className="grid grid-cols-2 gap-3">
                        {teamsList.map((team) => {
                            const isSelected = formData.teams.includes(team)
                            return (
                                <button
                                    key={team}
                                    onClick={() => {
                                        if (isSelected) {
                                            setFormData({ ...formData, teams: formData.teams.filter((t: string) => t !== team) })
                                        } else {
                                            setFormData({ ...formData, teams: [...formData.teams, team] })
                                        }
                                    }}
                                    className={cn(
                                        "h-14 rounded-2xl border flex items-center justify-between px-5 transition-all duration-300",
                                        isSelected ? "bg-blue-500/20 border-blue-500 text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    <span className="text-sm font-bold">{team}</span>
                                    {isSelected && <Check className="w-4 h-4" />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[2rem] shadow-inner">
                    <div className="flex flex-col gap-1">
                        <span className="text-base font-bold text-white/90">Atribuição Aleatória</span>
                        <span className="text-xs text-[#64748B]">Distribuir leads proporcionalmente entre os membros dos times</span>
                    </div>
                    <Switch
                        checked={formData.randomAssignment}
                        onCheckedChange={(val) => setFormData({ ...formData, randomAssignment: val })}
                    />
                </div>
            </div>
        </div>
    )
}

function Step7({ formData, setFormData }: any) {
    const attributeTypes = ["NOME", "CPF", "ENDEREÇO", "E-MAIL", "TELEFONE", "CNPJ", "TIPO_SERVICO"]

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Atributos do Usuário</h2>
                <p className="text-sm text-[#94A3B8]">Quais dados a IA deve obrigatoriamente coletar?</p>
            </div>

            <div className="apple-glass-panel p-8 space-y-6">
                <Button
                    className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center justify-center gap-2"
                    onClick={() => setFormData({ ...formData, attributes: [...formData.attributes, { fieldType: "NOME", description: "", isRequired: true }] })}
                >
                    <Plus className="w-5 h-5" /> Novo Atributo de Coleta
                </Button>

                <div className="space-y-4">
                    {formData.attributes.map((attr: any, i: number) => (
                        <div key={i} className="apple-glass-panel p-6 space-y-6 border-white/5 bg-white/[0.02]">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Coleta #{i + 1}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400/50 hover:text-red-400"
                                    onClick={() => {
                                        const newAttrs = formData.attributes.filter((_: any, idx: number) => idx !== i)
                                        setFormData({ ...formData, attributes: newAttrs })
                                    }}
                                >
                                    Excluir
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Tipo do Dado</label>
                                    <select
                                        value={attr.fieldType}
                                        onChange={(e) => {
                                            const newA = [...formData.attributes]
                                            newA[i].fieldType = e.target.value
                                            setFormData({ ...formData, attributes: newA })
                                        }}
                                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 outline-none"
                                    >
                                        {attributeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <Switch
                                        checked={attr.isRequired}
                                        onCheckedChange={(val) => {
                                            const newA = [...formData.attributes]
                                            newA[i].isRequired = val
                                            setFormData({ ...formData, attributes: newA })
                                        }}
                                    />
                                    <span className="text-xs font-bold text-white/70">Obrigatório antes de avançar</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Instrução de Solicitação (Prompt)</label>
                                <Input
                                    value={attr.description}
                                    onChange={(e) => {
                                        const newA = [...formData.attributes]
                                        newA[i].description = e.target.value
                                        setFormData({ ...formData, attributes: newA })
                                    }}
                                    placeholder="Ex: Peça o nome completo do cliente de forma educada."
                                    className="bg-white/5 border-white/10 rounded-xl h-10"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Step8({ formData, setFormData }: any) {
    const styles = [
        { id: "PROFESSIONAL", label: "Profissional", desc: "Formal, corporativo e focado em objetividade.", color: "bg-blue-500" },
        { id: "FRIENDLY", label: "Amigável", desc: "Casual, acolhedor e usa emojis moderadamente.", color: "bg-emerald-500" },
        { id: "CONSULTATIVE", label: "Consultivo", desc: "Focado em orientação, detalhista e autoritário.", color: "bg-violet-500" },
    ]

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Personalidade</h2>
                <p className="text-sm text-[#94A3B8]">Como o bot deve soar durante a conversa?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {styles.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => setFormData({ ...formData, communicationStyle: style.id })}
                        className={cn(
                            "apple-glass-panel p-6 flex items-start gap-6 text-left transition-all duration-300 relative overflow-hidden group",
                            formData.communicationStyle === style.id ? "border-white/20 bg-white/10" : "border-white/5 hover:border-white/10"
                        )}
                    >
                        {formData.communicationStyle === style.id && (
                            <div className={cn("absolute inset-y-0 left-0 w-1", style.color)} />
                        )}
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform", formData.communicationStyle === style.id ? style.color : "bg-white/5")}>
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 pr-6">
                            <h3 className="text-base font-bold text-white/90 mb-1">{style.label}</h3>
                            <p className="text-sm font-medium text-[#64748B]">{style.desc}</p>
                        </div>
                        <div className={cn(
                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                            formData.communicationStyle === style.id ? "bg-white border-white" : "border-white/10"
                        )}>
                            {formData.communicationStyle === style.id && <Check className="w-4 h-4 text-black" />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="apple-glass-panel p-8 bg-black/40">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Exemplo de Resposta (Preview)</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-sm font-medium text-white/80 italic">
                        {formData.communicationStyle === 'PROFESSIONAL' && '"Bom dia. Sou assistente da Advocacia Silva. Com quem tenho o prazer de falar e qual a natureza do seu assunto?"'}
                        {formData.communicationStyle === 'FRIENDLY' && '"Olá! Tudo bem? 😊 Sou a Maya da Advocacia Silva. Como posso te ajudar hoje?"'}
                        {formData.communicationStyle === 'CONSULTATIVE' && '"Olá, me chamo Maya. Primeiramente, para que eu possa te orientar da melhor forma sobre seus direitos, poderia me contar um pouco sobre o seu caso?"'}
                    </p>
                </div>
            </div>
        </div>
    )
}

function Step9({
    formData,
    setFormData,
    testChatMessages,
    setTestChatMessages,
    testMessage,
    setTestMessage,
    isSendingTest,
    handleSendTestMessage
}: any) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Objetivo do Fluxo</h2>
                <p className="text-sm text-[#94A3B8]">Finalize o propósito principal deste agente.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => setFormData({ ...formData, flow: "QUALIFICATION" })}
                    className={cn(
                        "apple-glass-panel p-6 flex flex-col gap-4 text-left transition-all duration-300",
                        formData.flow === "QUALIFICATION" ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/5 hover:border-white/10"
                    )}
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white/90">Qualificação</h3>
                        <p className="text-xs font-medium text-[#64748B] mt-1">Coletar dados, validar dor e preparar o lead para o vendedor.</p>
                    </div>
                </button>

                <button
                    onClick={() => setFormData({ ...formData, flow: "SCHEDULING" })}
                    className={cn(
                        "apple-glass-panel p-6 flex flex-col gap-4 text-left transition-all duration-300",
                        formData.flow === "SCHEDULING" ? "border-blue-500/50 bg-blue-500/10" : "border-white/5 hover:border-white/10"
                    )}
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white/90">Agendamento</h3>
                        <p className="text-xs font-medium text-[#64748B] mt-1">Verificação de agenda e marcação de reuniões automática.</p>
                    </div>
                </button>
            </div>

            <div className="apple-glass-panel p-8 space-y-4">
                <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Instrução Mestra (System Prompt)</label>
                <Textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Se deixar em branco, geraremos uma instrução otimizada baseada nos passos anteriores..."
                    className="bg-white/5 border-white/10 rounded-2xl min-h-[150px] text-sm"
                />
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-[10px] font-medium text-blue-200/70">
                        O motor de IA usará todos os dados cadastrados nos passos 1 a 8 para criar o contexto dinâmico dessa instrução.
                    </p>
                </div>
            </div>

            {/* Test Chat UI */}
            <div className="apple-glass-panel overflow-hidden flex flex-col h-[400px] border-blue-500/20 shadow-2xl shadow-blue-500/5">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-white/90 uppercase tracking-widest">Chat de Teste em Tempo Real</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTestChatMessages([])}
                        className="text-[10px] h-7 text-white/40 hover:text-white"
                    >
                        Limpar Chat
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                    {testChatMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <Bot className="w-8 h-8 text-white/10 mb-2" />
                            <p className="text-xs text-white/30 italic">Envie uma mensagem para testar a personalidade e o conhecimento da {formData.name || 'sua IA'}.</p>
                        </div>
                    )}
                    {testChatMessages.map((msg, i) => (
                        <div key={i} className={cn(
                            "flex flex-col max-w-[85%]",
                            msg.role === "user" ? "ml-auto items-end" : "items-start"
                        )}>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/10 text-white/90 border border-white/5 rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isSendingTest && (
                        <div className="flex items-start">
                            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5 animate-pulse">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce delay-75" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce delay-150" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 border-t border-white/10">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendTestMessage();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Teste a IA aqui..."
                            className="bg-black/20 border-white/10 rounded-xl h-10 text-sm"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isSendingTest || !testMessage.trim()}
                            className="bg-blue-600 hover:bg-blue-500 rounded-xl w-10 h-10 shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
