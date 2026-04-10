'use client'

import { useState } from 'react'
import {
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    TextField,
    Label,
    Input,
    FieldError,
    Select,
    ListBox,
    ListBoxItem,
    Spinner,
} from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeOnboardingAction } from '@/actions/auth-actions'
import { useRouter } from 'next/navigation'
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-mutation'

const ORG_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const

export function OnboardingModal() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [displayName, setDisplayName] = useState('')
    const [orgName, setOrgName] = useState('')
    const [orgSize, setOrgSize] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [serverError, setServerError] = useState('')

    function validate(): boolean {
        const newErrors: Record<string, string> = {}
        if (displayName.length < 2) newErrors.displayName = 'Must be at least 2 characters'
        if (!orgName) newErrors.orgName = 'Organization name is required'
        if (!orgSize) newErrors.orgSize = 'Please select a size'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const mutation = useMutation({
        mutationFn: () =>
            completeOnboardingAction({ displayName, orgName, orgSize }),
        ...useOptimisticUpdate(['profile'], '', { displayName }),
        onSuccess: result => {
            if (!result.ok) {
                setServerError(result.error.message)
                return
            }
            queryClient.setQueryData(['organization'], { name: orgName })
            router.refresh()
        },
        onError: () => {
            setServerError('Something went wrong. Please try again.')
        },
    })

    function handleSubmit() {
        if (!validate()) return
        setServerError('')
        mutation.mutate()
    }

    return (
        <ModalBackdrop isOpen isDismissable={false} className="bg-foreground/20 backdrop-blur-sm">
            <ModalContainer>
                <ModalDialog className="overflow-hidden" aria-label="Onboarding">
                    <ModalHeader>Welcome to CosmoOps</ModalHeader>
                    <ModalBody className="flex flex-col gap-5 py-6 px-1">
                        <p className="text-sm text-foreground/60">
                            Tell us a bit about yourself to get started.
                        </p>
                        <TextField.Root isInvalid={!!errors.displayName} className="flex flex-col gap-1.5">
                            <Label>Your display name</Label>
                            <Input
                                variant="secondary"
                                value={displayName}
                                onChange={e => { setDisplayName(e.target.value); setErrors(er => ({ ...er, displayName: '' })) }}
                                autoFocus
                                className="w-full"
                                placeholder="Your name"
                                maxLength={100}
                            />
                            <FieldError>{errors.displayName}</FieldError>
                        </TextField.Root>
                        <TextField.Root isInvalid={!!errors.orgName} className="flex flex-col gap-1.5">
                            <Label>Organization name</Label>
                            <Input
                                variant="secondary"
                                value={orgName}
                                onChange={e => { setOrgName(e.target.value); setErrors(er => ({ ...er, orgName: '' })) }}
                                className="w-full"
                                placeholder="Organization name"
                                maxLength={150}
                            />
                            <FieldError>{errors.orgName}</FieldError>
                        </TextField.Root>
                        <div className="flex flex-col gap-1.5">
                            <Select.Root
                                variant='secondary'
                                value={orgSize || null}
                                onChange={key => {
                                    setOrgSize(key as string)
                                    setErrors(er => ({ ...er, orgSize: '' }))
                                }}
                                aria-label="Organization size"
                            >
                                <Select.Trigger>
                                    <Select.Value>{orgSize ? `${orgSize} employees` : 'Select organization size'}</Select.Value>
                                    <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                    <ListBox>
                                        {ORG_SIZES.map(size => (
                                            <ListBoxItem key={size} id={size} textValue={`${size} employees`}>{size} employees</ListBoxItem>
                                        ))}
                                    </ListBox>
                                </Select.Popover>
                            </Select.Root>
                            {errors.orgSize && <p className="text-xs text-danger">{errors.orgSize}</p>}
                        </div>
                        {serverError && <p className="text-sm text-danger">{serverError}</p>}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="primary"
                            onPress={handleSubmit}
                            isDisabled={mutation.isPending}
                            fullWidth
                        >
                            {mutation.isPending && <Spinner size="sm" />}
                            {mutation.isPending ? 'Getting started…' : 'Get started'}
                        </Button>
                    </ModalFooter>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    )
}
