"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message === "Invalid login credentials"
                ? "Email ou senha incorretos"
                : error.message
            )
            setLoading(false)
            return
        }

        router.push("/dashboard")
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--nexcrm-gradient-start)] to-[var(--nexcrm-gradient-end)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                        <span className="text-white font-bold text-xl">N</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-white">
                        Bem-vindo ao{" "}
                        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            NexCRM
                        </span>
                    </h1>
                    <p className="text-sm text-[#94A3B8] mt-2">
                        Entre com sua conta para continuar
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="glass-card p-6 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 animate-slide-up">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#94A3B8]">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus:ring-blue-500/30 focus:border-blue-500/50 h-11 rounded-xl"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#94A3B8]">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus:ring-blue-500/30 focus:border-blue-500/50 h-11 rounded-xl"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-gradient w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Entrar
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Register link */}
                <p className="text-center text-sm text-[#64748B] mt-6">
                    Não tem uma conta?{" "}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                        Criar conta
                    </Link>
                </p>
            </div>
        </div>
    )
}
