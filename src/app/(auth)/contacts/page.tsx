"use client"

import { Search, Plus, MoreHorizontal, Filter, Mail, Phone, User as UserIcon } from "lucide-react"
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
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-slide-up">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90">Contatos</h1>
                        <p className="text-sm font-medium text-[#94A3B8] mt-1">{contacts.length} contatos sincronizados</p>
                    </div>
                    <button className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300">
                        <Plus className="w-5 h-5" />
                        Novo Contato
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <div className="relative w-full sm:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-blue-400 transition-colors duration-300" />
                        <Input
                            placeholder="Buscar contatos por nome, email ou telefone..."
                            className="w-full pl-12 pr-4 h-12 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/90 placeholder:text-white/30 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-white/10 transition-colors shadow-inner backdrop-blur-md"
                        />
                    </div>
                    <button className="w-full sm:w-auto flex items-center justify-center h-12 gap-2 px-6 rounded-2xl text-sm font-semibold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all shadow-inner backdrop-blur-md hover:border-white/20">
                        <Filter className="w-[18px] h-[18px]" />
                        Filtrar Lista
                    </button>
                </div>

                {/* Contacts Table (Desktop / Tablet) */}
                <div className="hidden sm:block apple-glass-panel rounded-3xl overflow-hidden animate-slide-up shadow-2xl relative" style={{ animationDelay: "0.2s" }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    <table className="w-full relative z-10">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-black/20">
                                <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pl-6">Nome e Foto</th>
                                <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Contato Técnico</th>
                                <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Etiquetas</th>
                                <th className="text-right px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pr-6">Opções</th>
                            </tr>
                        </thead>
                        <tbody className="stagger-children relative divide-y divide-white/[0.04]">
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-white/[0.04] transition-colors cursor-pointer group">
                                    <td className="px-6 py-4 pl-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                <UserIcon className="w-5 h-5 text-white/70" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white/90 group-hover:text-blue-400 transition-colors">{contact.name}</div>
                                                <div className="text-xs font-medium text-[#64748B] mt-0.5">Criado em {new Date().toLocaleDateString('pt-BR')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                                                <Mail className="w-3.5 h-3.5 text-white/40" />
                                                {contact.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                                                <Phone className="w-3.5 h-3.5 text-white/40" />
                                                {contact.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {contact.labels.map((label) => (
                                                <Badge key={label.name} className={`text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider text-white border border-white/20 shadow-sm ${label.color}/80 backdrop-blur-sm hover:${label.color} transition-colors`}>
                                                    {label.name}
                                                </Badge>
                                            ))}
                                            {/* Dummy Add button */}
                                            <button className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors text-white/40 hover:text-white group-hover:opacity-100 opacity-0">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 pr-6 text-right">
                                        <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 shadow-sm">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="sm:hidden flex flex-col gap-3 animate-slide-up stagger-children" style={{ animationDelay: "0.2s" }}>
                    {contacts.map((contact) => (
                        <div key={contact.id} className="apple-glass-panel p-5 rounded-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/20 shadow-inner">
                                        <UserIcon className="w-4 h-4 text-white/70" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white/90">{contact.name}</h3>
                                        <p className="text-xs text-[#64748B] mt-0.5">Criado hoje</p>
                                    </div>
                                </div>
                                <button className="p-2 rounded-xl text-white/40 hover:text-white bg-white/5 border border-white/5">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2 mb-4 relative z-10">
                                <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                                    <Mail className="w-3.5 h-3.5 text-white/40" />
                                    {contact.email}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                                    <Phone className="w-3.5 h-3.5 text-white/40" />
                                    {contact.phone}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 relative z-10">
                                {contact.labels.map((label) => (
                                    <span key={label.name} className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider text-white border border-white/20 shadow-sm ${label.color}/80 backdrop-blur-sm`}>
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}
