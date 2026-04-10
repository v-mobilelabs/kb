import { getServerContext } from '@/lib/server-context'
import { adminDb } from '@/lib/firebase/admin'
import { ApiKeyCreateForm } from '@/components/settings/api-key-create-form'
import { ApiKeyList } from '@/components/settings/api-key-list'
import { OrgDetailsForm } from '@/components/settings/org-details-form'
import { Separator } from '@heroui/react'
import { ListApiKeysUseCase } from '@/data/organizations/use-cases/list-api-keys-use-case'
import type { AppContext } from '@/lib/middleware/with-context'

export const metadata = { title: 'Settings | CosmoOps' }

export default async function SettingsPage() {
    const { orgId, uid, user } = await getServerContext()

    const orgSnap = await adminDb.collection('organizations').doc(orgId ?? '').get()
    const orgName: string = orgSnap.data()?.name ?? 'My Organization'

    // Fetch API keys on server
    const ctx: AppContext = {
        uid,
        orgId: orgId ?? '',
        email: (user?.email as string) ?? '',
    }
    const apiKeysUc = new ListApiKeysUseCase(ctx)
    const apiKeysResult = await apiKeysUc.execute({})
    const initialApiKeys = apiKeysResult.ok ? apiKeysResult.value : { keys: [] }

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
                <OrgDetailsForm orgId={orgId ?? ''} initialName={orgName} />
            </section>

            <Separator />

            <section className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-semibold">API Keys</h2>
                    <p className="text-sm text-foreground/60">
                        Create and manage API keys for programmatic access.
                    </p>
                </div>

                <ApiKeyCreateForm orgId={orgId ?? ''} />

                <Separator />

                <h3 className="text-sm font-medium text-foreground/80">Active Keys</h3>
                <ApiKeyList orgId={orgId ?? ''} initialKeys={initialApiKeys.keys} />
            </section>
        </main>
    )
}
