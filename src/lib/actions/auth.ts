"use server"

import { getAdminClient } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"

export async function registerMasterAdminAction(data: { name: string; email: string; companyName: string }) {
    try {
        const supabaseAdmin = getAdminClient()

        // 1. Create User in Supabase Auth bypassing email confirmation for immediate access
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: "temporary_password", // Placeholder, we assume the frontend sends real passwords, wait, I need to adjust this to accept the user's password securely
            email_confirm: true,
            user_metadata: { name: data.name }
        })
        return { success: false, error: "Refined approach needed to handle password" }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
