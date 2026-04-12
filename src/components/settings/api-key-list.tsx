'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Chip } from '@heroui/react'
import { revokeApiKeyAction } from '@/actions/organization-actions'
import { ReusableConfirmModal } from '@/components/shared/reusable-confirm-modal'
import { useRouter } from 'next/navigation'

interface ApiKey {
    id: string
    name: string
    maskedKey: string
    createdAt: string
    lastUsedAt: string | null
}

interface ApiKeyListProps {
    orgId: string
    initialKeys?: ApiKey[]
}

export function ApiKeyList({ orgId: _orgId, initialKeys = [] }: Readonly<ApiKeyListProps>) {
    const router = useRouter()
    const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null)

    const revokeMutation = useMutation({
        mutationFn: (keyId: string) => revokeApiKeyAction({ keyId }),
        onSuccess: result => {
            if (!result.ok) return
            setRevokeTarget(null)
            router.refresh()
        },
    })

    if (initialKeys.length === 0) {
        return <p className="text-sm text-foreground/50">No active API keys. Create one above.</p>
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                {initialKeys.map(k => (
                    <div
                        key={k.id}
                        className="flex items-center justify-between bg-surface border border-foreground/10 rounded-lg px-4 py-3"
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{k.name}</span>
                            <code className="text-xs text-foreground/60 font-mono">{k.maskedKey}</code>
                            <span className="text-xs text-foreground/40">
                                {k.lastUsedAt
                                    ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                                    : 'Never used'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Chip size="sm" color="success" variant="soft">Active</Chip>
                            <Button
                                size="sm"
                                variant="danger"
                                onPress={() => setRevokeTarget({ id: k.id, name: k.name })}
                            >
                                Revoke
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <ReusableConfirmModal
                isOpen={!!revokeTarget}
                title="Revoke API key?"
                message={`"${revokeTarget?.name}" will stop working immediately. This cannot be undone.`}
                confirmLabel="Revoke key"
                onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
                onDismiss={() => setRevokeTarget(null)}
                isPending={revokeMutation.isPending}
            />
        </>
    )
}
