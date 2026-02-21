import { Sidebar } from "@/components/sidebar/sidebar"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-transparent">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative z-10 flex flex-col">
                {children}
            </main>
        </div>
    )
}
