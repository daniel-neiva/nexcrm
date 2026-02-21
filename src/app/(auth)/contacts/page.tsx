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
                    <h1 className="text-2xl font-semibold text-white">Contatos</h1>
                    <p className="text-sm text-[#94A3B8] mt-1">{contacts.length} contatos cadastrados</p>
                </div>
                <button className="btn-gradient px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Contato
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <Input
                        placeholder="Buscar contatos..."
                        className="pl-9 bg-white/5 border-white/10 text-sm text-white placeholder:text-[#64748B] focus:ring-blue-500/30 focus:border-blue-500/50"
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[#94A3B8] bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <Filter className="w-4 h-4" />
                    Filtrar
                </button>
            </div>

            {/* Contacts Table */}
            <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left px-5 py-3.5 text-xs font-medium text-[#64748B] uppercase tracking-wider">Nome</th>
                            <th className="text-left px-5 py-3.5 text-xs font-medium text-[#64748B] uppercase tracking-wider">Email</th>
                            <th className="text-left px-5 py-3.5 text-xs font-medium text-[#64748B] uppercase tracking-wider">Telefone</th>
                            <th className="text-left px-5 py-3.5 text-xs font-medium text-[#64748B] uppercase tracking-wider">Etiquetas</th>
                            <th className="text-right px-5 py-3.5 text-xs font-medium text-[#64748B] uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="stagger-children">
                        {contacts.map((contact) => (
                            <tr key={contact.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center border border-white/10">
                                            <span className="text-xs font-semibold text-white">
                                                {contact.name.split(" ").map((n) => n[0]).join("")}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-white">{contact.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-[#94A3B8]">{contact.email}</td>
                                <td className="px-5 py-4 text-sm text-[#94A3B8]">{contact.phone}</td>
                                <td className="px-5 py-4">
                                    <div className="flex gap-1.5">
                                        {contact.labels.map((label) => (
                                            <Badge key={label.name} className={`text-[10px] px-2 py-0 h-5 text-white border-0 ${label.color}`}>
                                                {label.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <button className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                                        <MoreHorizontal className="w-4 h-4" />
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
