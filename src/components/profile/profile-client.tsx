'use client'

import { useState } from 'react'
import { Button, TextField, Label, Input, FieldError, Spinner } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateDisplayNameAction, deleteAccountAction } from '@/actions/profile-actions'
import { ReusableConfirmModal } from '@/components/shared/reusable-confirm-modal'
import { useRouter } from 'next/navigation'

interface ProfileClientProps {
    initialDisplayName: string
    uid: string
}

interface ProfileData {
    displayName: string
}

export function ProfileClient({ initialDisplayName, uid }: ProfileClientProps) {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [displayName, setDisplayName] = useState(initialDisplayName)
    const [nameError, setNameError] = useState('')
    const [nameSuccess, setNameSuccess] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // Use query to manage profile data with initialData from SSR
    const { data: profileData } = useQuery<ProfileData>({
        queryKey: ['profile', uid],
        queryFn: async () => ({ displayName }), // In a real app, fetch from API
        initialData: { displayName: initialDisplayName },
        enabled: false, // Don't auto-fetch since we manage it via mutation
    })

    const nameMutation = useMutation({
        mutationFn: () => updateDisplayNameAction({ displayName }),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['profile', uid] })
            const prev = queryClient.getQueryData<ProfileData>(['profile', uid])
            queryClient.setQueryData(['profile', uid], { displayName })
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            queryClient.setQueryData(['profile', uid], ctx?.prev)
            setNameError('Failed to update name.')
        },
        onSuccess: result => {
            if (!result.ok) {
                setNameError(result.error.message)
                return
            }
            setNameSuccess('Display name updated.')
            setTimeout(() => setNameSuccess(''), 3000)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', uid] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteAccountAction(),
        onSuccess: result => {
            if (!result.ok) return
            router.push('/login')
        },
    })

    function handleSaveName(e: React.FormEvent) {
        e.preventDefault()
        if (displayName.length < 2) {
            setNameError('Display name must be at least 2 characters.')
            return
        }
        setNameError('')
        setNameSuccess('')
        nameMutation.mutate()
    }

    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-2xl font-semibold">Profile</h1>

            {/* Display name section */}
            <section className="flex flex-col gap-4">
                <h2 className="text-base font-medium">Display name</h2>
                <form onSubmit={handleSaveName} className="flex flex-col gap-3">
                    <TextField.Root isInvalid={!!nameError}>
                        <Label>Display name</Label>
                        <Input
                            value={displayName}
                            onChange={e => { setDisplayName(e.target.value); setNameError('') }}
                            className="w-full"
                        />
                        <FieldError>{nameError}</FieldError>
                    </TextField.Root>
                    {nameSuccess && <p className="text-sm text-success">{nameSuccess}</p>}
                    <Button
                        type="submit"
                        variant="primary"
                        isDisabled={nameMutation.isPending}
                        className="self-start"
                    >
                        {nameMutation.isPending ? <Spinner size="sm" /> : 'Save name'}
                    </Button>
                </form>
            </section>

            {/* Danger zone */}
            <section className="flex flex-col gap-4 border-t border-foreground/10 pt-6">
                <h2 className="text-base font-medium text-danger">Danger zone</h2>
                <p className="text-sm text-foreground/60">
                    Deleting your account permanently removes all your data including your organization and API keys.
                </p>
                <Button
                    variant="outline"
                    onPress={() => setShowDeleteModal(true)}
                    className="self-start"
                >
                    Delete account
                </Button>
            </section>

            <ReusableConfirmModal
                isOpen={showDeleteModal}
                title="Delete your account?"
                message="This will permanently delete your account, organization, and all API keys. This cannot be undone."
                confirmLabel="Yes, delete everything"
                onConfirm={() => deleteMutation.mutate()}
                onDismiss={() => setShowDeleteModal(false)}
                isPending={deleteMutation.isPending}
            />
        </div>
    )
}
