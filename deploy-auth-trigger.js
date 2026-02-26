const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAuthTrigger() {
  console.log('Deploying Updated Supabase Auth Trigger to Prisma DB...');

  try {
    // 1. Create the Function supporting both Master Admins and Invited Agents
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        target_account_id text;
        assigned_role public."Role";
      BEGIN
        -- Check if this user was invited to an existing account via user_metadata
        IF new.raw_user_meta_data->>'accountId' IS NOT NULL THEN
          -- Invited Agent
          target_account_id := new.raw_user_meta_data->>'accountId';
          assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'AGENT')::public."Role";
        ELSE
          -- Master Admin (New Workspace Signup)
          target_account_id := gen_random_uuid()::text;
          assigned_role := 'ADMIN';
          
          INSERT INTO public."Account" (id, name, plan, "updatedAt")
          VALUES (
            target_account_id,
            COALESCE(new.raw_user_meta_data->>'companyName', 'Minha Empresa'),
            'pro',
            now()
          );
        END IF;

        -- Create the User linked to the target Account
        INSERT INTO public."User" (id, "authId", name, email, role, status, "accountId", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          new.id::text,
          COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email,
          assigned_role,
          'OFFLINE',
          target_account_id,
          now()
        );

        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ Function updated successfully to support Metadata logic.');
  } catch (error) {
    console.error('❌ Error updating trigger:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAuthTrigger();
