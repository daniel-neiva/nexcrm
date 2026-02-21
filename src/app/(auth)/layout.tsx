import { Sidebar } from "@/components/sidebar/sidebar"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
