'use client'

import { useState } from 'react'
import { Button, Input, TextField, Label, FieldError, Spinner } from '@heroui/react'
import { useMutation } from '@tanstack/react-query'
import { updateOrganizationAction } from '@/actions/organization-actions'
import { useRouter } from 'next/navigation'

interface OrgDetailsFormProps {
    orgId: string
    initialName: string
}

export function OrgDetailsForm({ orgId: _orgId, initialName }: Readonly<OrgDetailsFormProps>) {
    const router = useRouter()
    const [name, setName] = useState(initialName)
    const [nameError, setNameError] = useState('')
    const [saved, setSaved] = useState(false)

    const mutation = useMutation<any, Error, void>({
        mutationFn: () => updateOrganizationAction({ name }),
        onSuccess: result => {
            if (!result.ok) { setNameError(result.error.message); return }
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
            router.refresh()
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
                {saved && <span className="text-sm text-success">Saved!</span>}
            </div>
        </form>
    )
}
