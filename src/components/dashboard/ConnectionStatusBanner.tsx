"use client"

import { useState, useEffect } from "react"
import { AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function ConnectionStatusBanner() {
    const [disconnectedInboxes, setDisconnectedInboxes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchInboxes = async () => {
        try {
            const res = await fetch("/api/inboxes")
            const data = await res.json()
            if (Array.isArray(data)) {
                const disconnected = data.filter(i => i.status !== 'CONNECTED')
                setDisconnectedInboxes(disconnected)
            }
        } catch (err) {
            console.error("Erro ao carregar inboxes no banner:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInboxes()

        const channel = supabase
            .channel('whatsapp_updates')
            .on('broadcast', { event: 'inbox_status_updated' }, () => {
                fetchInboxes()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    if (loading || disconnectedInboxes.length === 0) return null

    return (
        <div className="mb-8 animate-in slide-in-from-top duration-500">
            <div className="apple-glass-panel border-red-500/20 bg-red-500/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white/90">
                            {disconnectedInboxes.length === 1
                                ? `A instância "${disconnectedInboxes[0].name}" está desconectada`
                                : `${disconnectedInboxes.length} instâncias estão desconectadas`}
                        </p>
                        <p className="text-xs text-white/40 font-medium">
                            Você não poderá enviar ou receber mensagens nestas contas.
                        </p>
                    </div>
                </div>

                <Link
                    href="/settings/whatsapp"
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    RECONECTAR AGORA
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    )
}
