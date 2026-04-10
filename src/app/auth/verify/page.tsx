'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { clientAuth } from '@/lib/firebase/client'

export default function VerifyPage() {
    const router = useRouter()
    const [error, setError] = useState('')

    useEffect(() => {
        async function verify() {
            if (!isSignInWithEmailLink(clientAuth, globalThis.location.href)) {
                setError('Invalid or expired magic link.')
                return
            }

            const email = localStorage.getItem('emailForSignIn')
            if (!email) {
                setError('Could not find your email. Please request a new magic link.')
                return
            }

            const credential = await signInWithEmailLink(
                clientAuth,
                email,
                globalThis.location.href,
            ).catch(() => null)

            if (!credential) {
                setError('This link has expired or already been used. Please request a new one.')
                return
            }

            const idToken = await credential.user.getIdToken()

            const res = await fetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, email }),
            })

            if (!res.ok) {
                setError('Sign-in failed. Please try again.')
                return
            }

            localStorage.removeItem('emailForSignIn')
            router.replace('/dashboard')
        }

        verify()
    }, [router])

    if (error) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-4 bg-[--background]">
                <p className="text-sm text-[--danger] bg-[--danger]/10 border border-[--danger]/20 rounded-lg px-4 py-3 max-w-sm text-center">
                    {error}
                </p>
                <a href="/login" className="text-sm text-[--accent] hover:underline">
                    Back to sign in
                </a>
            </main>
        )
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[--background]">
            <p className="text-sm text-[--muted] animate-pulse">Signing you in…</p>
        </main>
    )
}
