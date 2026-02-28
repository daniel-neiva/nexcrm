"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Smartphone, ShieldCheck, MessageSquare, ChevronLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
export default function WhatsAppConnectPage({ params }: { params: { id: string } }) {
    const [status, setStatus] = useState<'LOADING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('LOADING')
    const [qrcode, setQrcode] = useState<string | null>(null)
    const [inbox, setInbox] = useState<any>(null)
    const [retryCount, setRetryCount] = useState(0)
    const router = useRouter()

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/whatsapp/instances/${params.id}/connect`)
            const data = await res.json()

            if (res.ok) {
                setStatus(data.status)
                setQrcode(data.qrcode || null)
                if (data.status === 'CONNECTED') {
                    console.log("WhatsApp Conectado!")
                    // Wait a bit then redirect
                    setTimeout(() => router.push("/settings/whatsapp"), 2000)
                }
            } else {
                setStatus('ERROR')
            }
        } catch (error) {
            console.error("Mark as read error:", error)
            setStatus('ERROR')
        }
    }, [params.id, router])

    useEffect(() => {
        const fetchInbox = async () => {
            const res = await fetch("/api/inboxes")
            const data = await res.json()
            const found = data.find((i: any) => i.id === params.id)
            setInbox(found)
        }
        fetchInbox()
        fetchStatus()
    }, [params.id, fetchStatus])

    // Poll for status while disconnected
    useEffect(() => {
        if (status === 'DISCONNECTED') {
            const interval = setInterval(fetchStatus, 5000)
            return () => clearInterval(interval)
        }
    }, [status, fetchStatus])

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl gap-2 h-10 px-4"
            >
                <ChevronLeft className="w-4 h-4" />
                Voltar
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Connection UI */}
                <Card className="apple-glass-panel border-white/10 backdrop-blur-xl bg-white/5 border-2 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl text-white">Conectar WhatsApp</CardTitle>
                        <CardDescription className="text-white/50">
                            Escaneie o código abaixo com seu celular
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-8">
                        {status === 'LOADING' ? (
                            <div className="w-64 h-64 rounded-3xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                <p className="text-xs text-white/40 font-medium">Buscando QR Code...</p>
                            </div>
                        ) : status === 'CONNECTED' ? (
                            <div className="w-64 h-64 rounded-3xl bg-green-500/10 flex flex-col items-center justify-center border border-green-500/20 animate-in zoom-in-95 duration-500">
                                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-green-400">CONECTADO</h3>
                                <p className="text-xs text-green-400/60 mt-2">Redirecionando...</p>
                            </div>
                        ) : status === 'ERROR' ? (
                            <div className="w-64 h-64 rounded-3xl bg-red-500/10 flex flex-col items-center justify-center border border-red-500/20">
                                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                                <p className="text-sm font-medium text-red-400">Erro na conexão</p>
                                <Button onClick={() => { setStatus('LOADING'); fetchStatus(); }} variant="ghost" className="mt-4 text-xs text-white/40 hover:text-white">
                                    Tentar Novamente
                                </Button>
                            </div>
                        ) : qrcode ? (
                            <div className="relative group p-4 bg-white rounded-[2rem] shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                                <img
                                    src={qrcode}
                                    alt="WhatsApp QR Code"
                                    className="w-56 h-56 object-contain"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]">
                                    <Button onClick={fetchStatus} size="sm" variant="outline" className="border-blue-500 text-blue-500 rounded-full hover:bg-blue-50">
                                        <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-64 h-64 rounded-3xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                                <AlertCircle className="w-8 h-8 text-white/20 mb-3" />
                                <p className="text-xs text-white/40 text-center px-8 italic">Não foi possível gerar o código. Verifique sua conexão.</p>
                            </div>
                        )}

                        <div className="mt-8 flex items-center gap-2 text-white/30 text-xs font-medium">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                            Conexão Segura e Criptografada
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Badge className="bg-blue-500/10 text-blue-400 border-0 rounded-full px-4 mb-2">Tutorial Passo a Passo</Badge>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Como conectar?</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            { step: 1, text: "Abra o WhatsApp no seu celular" },
                            { step: 2, text: "Toque em Opções ou Configurações" },
                            { step: 3, text: "Selecione Aparelhos Conectados" },
                            { step: 4, text: "Toque em Conectar um Aparelho" },
                            { step: 5, text: "Aponte a câmera para este código" },
                        ].map((item) => (
                            <div key={item.step} className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-blue-400 text-lg group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                    {item.step}
                                </div>
                                <p className="text-white/70 font-medium group-hover:text-white transition-colors">{item.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="apple-glass-panel p-6 border-white/10 rounded-3xl space-y-4 bg-white/[0.02]">
                        <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Informações Técnicas</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/30 italic">Instância:</span>
                                <span className="text-blue-400 font-mono font-bold uppercase">{inbox?.instanceName || "Processando..."}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/30 italic">Identificador:</span>
                                <span className="text-white/50">{inbox?.id?.substring(0, 12)}...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
