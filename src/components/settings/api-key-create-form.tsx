'use client'

import { useState } from 'react'
import { Button, Input, Card, TextField, Label, FieldError, Spinner } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createApiKeyAction } from '@/actions/organization-actions'
import { useOptimisticListAdd } from '@/lib/hooks/use-optimistic-mutation'

interface ApiKeyCreateFormProps {
    orgId: string
}

export function ApiKeyCreateForm({ orgId }: ApiKeyCreateFormProps) {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [nameError, setNameError] = useState('')
    const [createdKey, setCreatedKey] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const mutation = useMutation({
        mutationFn: () => createApiKeyAction({ name }),
        ...useOptimisticListAdd('api-keys', orgId),
        onSuccess: result => {
            if (!result.ok) {
                setNameError(result.error.message)
                return
            }
            setCreatedKey(result.value.key)
            setName('')
            // Update cache with full key data for display
            queryClient.setQueryData<{ keys: { id: string; name: string; maskedKey: string; createdAt: string; lastUsedAt: string | null }[] }>(
                ['api-keys', orgId],
                old => ({
                    keys: [
                        { id: result.value.id, name: result.value.name, maskedKey: result.value.maskedKey, createdAt: result.value.createdAt, lastUsedAt: null },
                        ...(old?.keys ?? []),
                    ],
                }),
            )
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name) { setNameError('Key name is required'); return }
        setNameError('')
        setCreatedKey(null)
        mutation.mutate()
    }

    async function handleCopy() {
        if (!createdKey) return
        await navigator.clipboard.writeText(createdKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <TextField.Root isInvalid={!!nameError} className="flex-1" variant="secondary">
                    <Label>Key name</Label>
                    <Input
                        placeholder="A descriptive name for your API key"
                        variant="secondary"
                        value={name}
                        onChange={e => { setName(e.target.value); setNameError('') }}
                        className="w-full"
                    />
                    <FieldError>{nameError}</FieldError>
                </TextField.Root>
                <Button
                    type="submit"
                    variant="primary"
                    isDisabled={mutation.isPending}
                >
                    {mutation.isPending ? <Spinner size="sm" /> : 'Create key'}
                </Button>
            </form>

            {createdKey && (
                <Card className="border border-success/30 bg-success/5">
                    <Card.Content className="gap-2">
                        <p className="text-xs text-success font-medium">
                            Copy this key now — it will never be shown again in full.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono bg-foreground/5 rounded px-3 py-2 break-all">
                                {createdKey}
                            </code>
                            <Button size="sm" variant="outline" onPress={handleCopy}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                    </Card.Content>
                </Card>
            )}
        </div>
    )
}
