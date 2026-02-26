"use client"

import { useState, useEffect } from "react"
import { Plus, MoreHorizontal, User as UserIcon, Shield, Trash2, Mail, Loader2, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Shared UI Types
type UserRole = "ADMIN" | "AGENT"
type UserStatus = "ONLINE" | "OFFLINE"

interface User {
    id: string
    name: string
    email: string
    role: UserRole
    status: UserStatus
    createdAt: string
}

export default function AgentsSettingsPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<User | null>(null)

    // Form States
    const [newName, setNewName] = useState("")
    const [newEmail, setNewEmail] = useState("")
    const [newRole, setNewRole] = useState<UserRole>("AGENT")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch Initial Data
    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users")
            const data = await res.json()
            if (Array.isArray(data)) setUsers(data)
        } catch (error) {
            console.error("Failed to fetch users", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || !newEmail) return

        setIsSubmitting(true)
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, email: newEmail, role: newRole })
            })

            if (res.ok) {
                await fetchUsers()
                setIsAddModalOpen(false)
                setNewName("")
                setNewEmail("")
                setNewRole("AGENT")
            } else {
                const err = await res.json()
                alert(err.error || "Erro ao adicionar usuário")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateRole = async (userId: string, targetRole: UserRole) => {
        try {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u))
            await fetch("/api/users/" + userId, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: targetRole })
            })
        } catch (error) {
            console.error(error)
            await fetchUsers() // Revert UI
        }
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/users/" + userToDelete.id, { method: "DELETE" })
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userToDelete.id))
                setIsDeleteModalOpen(false)
                setUserToDelete(null)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmDelete = (user: User) => {
        setUserToDelete(user)
        setIsDeleteModalOpen(true)
    }

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10">
            <div className="max-w-[1000px] mx-auto">
                {/* Header Navbar */}
                <div className="flex items-center gap-4 mb-8 animate-slide-up">
                    <Link href="/settings" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90">Gestão de Equipe</h1>
                        <p className="text-sm font-medium text-[#94A3B8] mt-1">Convidar, gerenciar permissões e controlar o acesso dos seus Atendentes</p>
                    </div>
                    <div className="flex-1" />
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary hidden sm:flex px-6 py-2.5 rounded-2xl text-sm font-bold items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300">
                        <Plus className="w-5 h-5" />
                        Convidar Atendente
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary sm:hidden w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Users Table / Glass Panel */}
                <div className="apple-glass-panel rounded-3xl overflow-hidden animate-slide-up shadow-2xl relative" style={{ animationDelay: "0.1s" }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/40">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                            Carregando usuários...
                        </div>
                    ) : (
                        <table className="w-full relative z-10">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-black/20">
                                    <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pl-6">Membro</th>
                                    <th className="hidden sm:table-cell text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Contato</th>
                                    <th className="text-left px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest">Nível de Acesso</th>
                                    <th className="text-right px-6 py-5 text-xs font-bold text-white/50 uppercase tracking-widest pr-6">Opções</th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children relative divide-y divide-white/[0.04]">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-sm font-medium text-white/40">
                                            Nenhum atendente cadastrado nessa conta.
                                        </td>
                                    </tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/[0.04] transition-colors group">
                                        <td className="px-6 py-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                                                    <UserIcon className="w-5 h-5 text-white/70" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white/90 truncate group-hover:text-blue-400 transition-colors">{u.name}</div>
                                                    <div className="text-xs font-medium text-[#64748B] mt-0.5 flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full ${u.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/20'}`} />
                                                        {u.status === 'ONLINE' ? 'Online agora' : 'Offline'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                                                <Mail className="w-3.5 h-3.5 text-white/40" />
                                                {u.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider text-white border border-white/20 shadow-sm backdrop-blur-sm transition-colors ${u.role === 'ADMIN' ? 'bg-violet-500/80 hover:bg-violet-500' : 'bg-slate-600/80 hover:bg-slate-600'}`}>
                                                {u.role === 'ADMIN' && <Shield className="w-3 h-3 mr-1.5 inline-block" />}
                                                {u.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 pr-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 shadow-sm outline-none">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-2xl p-2">
                                                    <DropdownMenuLabel className="text-xs font-bold text-white/40 uppercase tracking-widest px-2 py-1.5">Ações de Perfil</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        disabled={u.role === 'ADMIN'}
                                                        onClick={() => handleUpdateRole(u.id, 'ADMIN')}
                                                        className="gap-2 cursor-pointer focus:bg-blue-500/20 focus:text-blue-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                        <Shield className="w-4 h-4" /> Promover a Admin
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        disabled={u.role === 'AGENT'}
                                                        onClick={() => handleUpdateRole(u.id, 'AGENT')}
                                                        className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                        <UserIcon className="w-4 h-4" /> Rebaixar a Agente
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/5 my-1" />
                                                    <DropdownMenuItem
                                                        onClick={() => confirmDelete(u)}
                                                        className="gap-2 cursor-pointer focus:bg-red-500/20 focus:text-red-400 text-red-400 rounded-xl px-2 py-2 text-sm font-medium transition-colors">
                                                        <Trash2 className="w-4 h-4" /> Remover Acesso
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-md bg-[#020617]/95 border border-white/10 backdrop-blur-2xl text-white rounded-[2rem] p-0 overflow-hidden shadow-2xl shadow-blue-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5 pointer-events-none" />
                    <form onSubmit={handleCreateUser} className="relative z-10 flex flex-col p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold text-white/90">Convidar Atendente</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-[#94A3B8]">
                                Preencha os dados do novo membro. Ele gerará acessos automaticamente para sua conta.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mb-8">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Nome Completo</label>
                                <Input
                                    autoFocus
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ex: Ana Silva"
                                    className="h-12 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/90 placeholder:text-white/30 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-white/10 transition-colors shadow-inner px-4"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">E-mail Corporativo</label>
                                <Input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="ana@empresa.com"
                                    className="h-12 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/90 placeholder:text-white/30 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-white/10 transition-colors shadow-inner px-4"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Permissão Inicial</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        onClick={() => setNewRole('AGENT')}
                                        className={`cursor-pointer border rounded-2xl p-4 flex flex-col gap-1 transition-all ${newRole === 'AGENT' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                                        <span className="text-sm font-bold flex items-center gap-2"><UserIcon className="w-4 h-4" />Agente</span>
                                        <span className="text-[11px] leading-tight">Atende chats comuns.</span>
                                    </div>
                                    <div
                                        onClick={() => setNewRole('ADMIN')}
                                        className={`cursor-pointer border rounded-2xl p-4 flex flex-col gap-1 transition-all ${newRole === 'ADMIN' ? 'bg-violet-500/20 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                                        <span className="text-sm font-bold flex items-center gap-2"><Shield className="w-4 h-4" />Admin</span>
                                        <span className="text-[11px] leading-tight">Acesso total ao sistema.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-end gap-3 flex-col sm:flex-row mt-auto">
                            <Button type="button" variant="ghost" className="w-full sm:w-auto h-12 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 font-bold" onClick={() => setIsAddModalOpen(false)}>
                                Cancelar
                            </Button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto px-8 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 transition-all duration-300">
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Salvar e Convidar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md bg-[#020617]/95 border border-red-500/20 text-white rounded-[2rem] p-8 shadow-2xl shadow-red-500/10 backdrop-blur-xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-bold text-red-400">Remover Acesso</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-white/60">
                            Tem certeza que deseja remover permanentemente o acesso de <strong className="text-white">{userToDelete?.name}</strong> ao sistema? Os chats abertos por ele não serão apagados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" className="h-12 rounded-2xl text-white/70 hover:bg-white/10 font-bold px-6" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <button type="button" onClick={handleDeleteUser} disabled={isSubmitting} className="h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold px-6 flex items-center gap-2 transition-colors disabled:opacity-50">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Sim, remover
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
