"use client"

import { Search, Plus, MoreHorizontal, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const contacts = [
    { id: "1", name: "Maria Silva", email: "maria@email.com", phone: "+55 11 99999-8888", labels: [{ name: "Novo Lead", color: "bg-blue-500" }] },
    { id: "2", name: "João Santos", email: "joao@empresa.com", phone: "+55 21 98888-7777", labels: [{ name: "Cliente", color: "bg-emerald-500" }] },
    { id: "3", name: "Ana Oliveira", email: "ana@email.com", phone: "+55 31 97777-6666", labels: [{ name: "Interessado", color: "bg-violet-500" }] },
    { id: "4", name: "Carlos Mendes", email: "carlos@corp.com", phone: "+55 41 96666-5555", labels: [{ name: "Cliente", color: "bg-emerald-500" }, { name: "Premium", color: "bg-amber-500" }] },
]

export default function ContactsPage() {
    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Contatos</h1>
                    <p className="text-sm font-medium text-white/50 mt-1">{contacts.length} contatos cadastrados</p>
                </div>
                <button className="btn-primary px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Novo Contato
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" />
                    <Input
                        placeholder="Buscar contatos..."
                        className="pl-10 h-11 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/90 placeholder:text-white/40 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-white/10 transition-colors shadow-inner"
                    />
                </div>
                <button className="flex items-center h-11 gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all shadow-inner">
                    <Filter className="w-4 h-4" />
                    Filtrar
                </button>
            </div>

            {/* Contacts Table */}
            <div className="apple-glass-panel rounded-3xl overflow-hidden animate-slide-up shadow-xl" style={{ animationDelay: "0.2s" }}>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                            <th className="text-left px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest rounded-tl-3xl">Nome</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Email</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Telefone</th>
                            <th className="text-left px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Etiquetas</th>
                            <th className="text-right px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest rounded-tr-3xl">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="stagger-children relative">
                        {contacts.map((contact) => (
                            <tr key={contact.id} className="border-b border-white/[0.04] hover:bg-white/[0.06] transition-colors cursor-pointer group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                            <span className="text-xs font-bold text-white/90">
                                                {contact.name.split(" ").map((n) => n[0]).join("")}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{contact.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-white/60">{contact.email}</td>
                                <td className="px-6 py-4 text-sm font-medium text-white/60">{contact.phone}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {contact.labels.map((label) => (
                                            <Badge key={label.name} className={`text-[10px] font-semibold px-2.5 py-0.5 uppercase tracking-wide h-6 text-white border border-white/20 shadow-sm ${label.color}/80 backdrop-blur-sm`}>
                                                {label.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
