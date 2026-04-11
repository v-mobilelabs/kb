'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { Button, Card, TextField, Label, Input, FieldError, Spinner } from '@heroui/react'
import { sendMagicLinkAction } from '@/actions/auth-actions'
import { CaptchaProvider } from '@/components/providers/captcha-provider'

function LoginForm() {
    const { executeRecaptcha } = useGoogleReCaptcha()
    const [email, setEmail] = useState('')
    const [emailError, setEmailError] = useState('')
    const [sent, setSent] = useState(false)
    const [serverError, setServerError] = useState('')
    const [isPending, startTransition] = useTransition()

    function validate(): boolean {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email address.')
            return false
        }
        setEmailError('')
        return true
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!validate()) return
        setServerError('')
        startTransition(async () => {
            if (!executeRecaptcha) {
                setServerError('reCAPTCHA not ready. Please try again.')
                return
            }
            const captchaToken = await executeRecaptcha('send_magic_link')
            if (!captchaToken) {
                setServerError('reCAPTCHA failed to load. Please refresh and try again.')
                return
            }
            const result = await sendMagicLinkAction({ email, captchaToken })
            if (result.ok) {
                localStorage.setItem('emailForSignIn', email)
                setSent(true)
            } else {
                setServerError(result.error.message)
            }
        })
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 bg-[--background]">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold tracking-tight text-[--accent]">
                CosmoOps
            </Link>

            <Card className="w-full max-w-sm shadow-md">
                <Card.Content className="flex flex-col gap-5 py-8 px-6">
                    {sent ? (
                        <>
                            <div className="text-center">
                                <div className="text-3xl mb-3">📬</div>
                                <h1 className="text-xl font-semibold text-[--foreground]">Check your inbox</h1>
                                <p className="text-sm text-[--muted] mt-2">
                                    We sent a magic link to <strong className="text-[--foreground]">{email}</strong>.
                                    Click it to sign in.
                                </p>
                            </div>
                            <button
                                onClick={() => { setSent(false); setEmail('') }}
                                className="text-sm text-[--accent] hover:underline text-center"
                            >
                                Use a different email
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-center">
                                <h1 className="text-xl font-semibold text-[--foreground]">Sign in to CosmoOps</h1>
                                <p className="text-sm text-[--muted] mt-1">No password needed — we&apos;ll email you a link.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <TextField.Root isInvalid={!!emailError} fullWidth>
                                    <Label className="text-sm font-medium text-[--foreground]">Email address</Label>
                                    <Input
                                        variant='secondary'
                                        type="email"
                                        value={email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setEmailError('') }}
                                        autoComplete="email"
                                        autoFocus
                                        placeholder="you@company.com"
                                        className="w-full"
                                    />
                                    <FieldError className="text-xs">{emailError}</FieldError>
                                </TextField.Root>

                                {serverError && (
                                    <p className="text-xs text-[--danger] bg-[--danger]/10 border border-[--danger]/20 rounded-lg px-3 py-2">
                                        {serverError}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    isDisabled={isPending}
                                    fullWidth
                                >
                                    {isPending ? <Spinner size="sm" /> : 'Send magic link'}
                                </Button>
                            </form>

                            <p className="text-[10px] text-center text-[--muted]">
                                Protected by reCAPTCHA —{' '}
                                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy</a>
                                {' & '}
                                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>
                            </p>
                        </>
                    )}
                </Card.Content>
            </Card>

            <p className="text-xs text-[--muted]">
                By signing in you agree to our{' '}
                <span className="text-[--accent] hover:underline cursor-pointer">Terms of Service</span>.
            </p>
        </main>
    )
}

export default function LoginPage() {
    return (
        <CaptchaProvider>
            <LoginForm />
        </CaptchaProvider>
    )
}
