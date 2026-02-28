"use client"

import { ArrowLeft, Tag } from "lucide-react"
import Link from "next/link"

export default function LabelsSettingsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/settings" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white/70" />
                </Link>
                <h1 className="text-3xl font-bold text-white">Etiquetas</h1>
            </div>

            <div className="apple-glass-panel p-12 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                    <Tag className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Página em Desenvolvimento</h2>
                <p className="text-white/40 max-w-sm">O gerenciador avançado de etiquetas e automação por cores está sendo finalizado.</p>
            </div>
        </div>
    )
}
