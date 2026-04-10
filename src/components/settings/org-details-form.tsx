'use client'

import { useState } from 'react'
import { Button, Input, TextField, Label, FieldError, Spinner } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateOrganizationAction } from '@/actions/organization-actions'
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-mutation'

interface OrgDetailsFormProps {
    orgId: string
    initialName: string
}

interface OrgData {
    name: string
}

export function OrgDetailsForm({ orgId, initialName }: OrgDetailsFormProps) {
    const queryClient = useQueryClient()
    const [name, setName] = useState(initialName)
    const [nameError, setNameError] = useState('')
    const [saved, setSaved] = useState(false)

    // Use query to manage org data with initialData from SSR
    const { data: orgData } = useQuery<OrgData>({
        queryKey: ['org-details', orgId],
        queryFn: async () => {
            // In a real app, you'd have an API endpoint for this
            // For now, just return the current state
            return { name }
        },
        initialData: { name: initialName },
        enabled: false, // Don't auto-fetch since we manage it via mutation
    })

    const mutation = useMutation<any, Error, void>({
        mutationFn: () => updateOrganizationAction({ name }),
        ...useOptimisticUpdate(['org-details'], orgId, { name }),
        onSuccess: result => {
            if (!result.ok) {
                setNameError(result.error.message)
                return
            }
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', orgId] })
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { setNameError('Organization name is required'); return }
        setNameError('')
        setSaved(false)
        mutation.mutate()
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField.Root isInvalid={!!nameError} variant="secondary">
                <Label>Organization name</Label>
                <Input
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError('') }}
                    className="w-full"
                />
                <FieldError>{nameError}</FieldError>
            </TextField.Root>

            <div className="flex items-center gap-3">
                <Button
                    type="submit"
                    variant="primary"
                    isDisabled={mutation.isPending || name === initialName}
                >
                    {mutation.isPending ? <Spinner size="sm" /> : 'Save changes'}
                </Button>
                {saved && (
                    <span className="text-sm text-success">Saved!</span>
                )}
            </div>
        </form>
    )
}
