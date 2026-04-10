'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Chip } from '@heroui/react'
import { listApiKeysAction, revokeApiKeyAction } from '@/actions/organization-actions'
import { ReusableConfirmModal } from '@/components/shared/reusable-confirm-modal'

interface ApiKeyListProps {
    orgId: string
    initialKeys?: Array<{ id: string; name: string; maskedKey: string; createdAt: string; lastUsedAt: string | null }>
}

export function ApiKeyList({ orgId, initialKeys = [] }: ApiKeyListProps) {
    const queryClient = useQueryClient()
    const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['api-keys', orgId],
        queryFn: async () => {
            const result = await listApiKeysAction()
            if (!result.ok) throw new Error(result.error.message)
            return result.value
        },
        initialData: initialKeys.length > 0 ? { keys: initialKeys } : undefined,
    })

    const revokeMutation = useMutation({
        mutationFn: (keyId: string) => revokeApiKeyAction({ keyId }),
        onMutate: async keyId => {
            await queryClient.cancelQueries({ queryKey: ['api-keys', orgId] })
            const prev = queryClient.getQueryData<typeof data>(['api-keys', orgId])
            queryClient.setQueryData<typeof data>(['api-keys', orgId], old => ({
                keys: (old?.keys ?? []).filter(k => k.id !== keyId),
            }))
            return { prev }
        },
        onError: (_err, _keyId, ctx) => {
            queryClient.setQueryData(['api-keys', orgId], ctx?.prev)
        },
        onSuccess: () => {
            setRevokeTarget(null)
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', orgId] })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys', orgId] })
        },
    })

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="h-14 bg-foreground/10 rounded-lg" />
                ))}
            </div>
        )
    }

    const keys = data?.keys ?? []

    if (keys.length === 0) {
        return (
            <p className="text-sm text-foreground/50">
                No active API keys. Create one above.
            </p>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                {keys.map(k => (
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
