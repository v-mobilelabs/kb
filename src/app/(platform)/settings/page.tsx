import { Suspense } from 'react'
import { getServerContext } from '@/lib/server-context'
import { adminDb } from '@/lib/firebase/admin'
import { ApiKeyCreateForm } from '@/components/settings/api-key-create-form'
import { ApiKeyList } from '@/components/settings/api-key-list'
import { OrgDetailsForm } from '@/components/settings/org-details-form'
import { Separator } from '@heroui/react'
import { ListApiKeysUseCase } from '@/data/organizations/use-cases/list-api-keys-use-case'
import type { AppContext } from '@/lib/middleware/with-context'

export const metadata = { title: 'Settings | CosmoOps' }

function ApiKeysSkeleton() {
    return (
        <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2].map(i => (
                <div key={i} className="h-14 bg-foreground/10 rounded-lg" />
            ))}
        </div>
    )
}

async function ApiKeysServer({ orgId, uid, email }: { orgId: string; uid: string; email: string }) {
    const ctx: AppContext = { uid, orgId, email }
    const result = await new ListApiKeysUseCase(ctx).execute({})
    const keys = result.ok ? result.value.keys : []
    return <ApiKeyList orgId={orgId} initialKeys={keys} />
}

async function OrgNameServer({ orgId }: { orgId: string }) {
    const orgSnap = await adminDb.collection('organizations').doc(orgId).get()
    return (orgSnap.data()?.name as string) ?? 'My Organization'
}

export default async function SettingsPage() {
    const { orgId, uid, user } = await getServerContext()
    const safeOrgId = orgId ?? ''
    const email = (user?.email as string) ?? ''

    const orgName = await OrgNameServer({ orgId: safeOrgId })

    return (
        <main className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-foreground/60 mt-1">{orgName}</p>
            </div>
            <Separator />
            <section className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Organization</h2>
                    <p className="text-sm text-foreground/60">Update your organization details.</p>
                </div>
                <OrgDetailsForm orgId={safeOrgId} initialName={orgName} />
            </section>
            <Separator />
            <section className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold">API Keys</h2>
                    <p className="text-sm text-foreground/60">Create and manage API keys for programmatic access.</p>
                </div>
                <ApiKeyCreateForm orgId={safeOrgId} />
                <Separator />
                <h3 className="text-sm font-medium text-foreground/80">Active Keys</h3>
                <Suspense fallback={<ApiKeysSkeleton />}>
                    <ApiKeysServer orgId={safeOrgId} uid={uid} email={email} />
                </Suspense>
            </section>
        </main>
    )
}
