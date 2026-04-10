import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { PlatformNav } from '@/components/layout/platform-nav'
import type { ReactNode } from 'react'

interface PlatformLayoutProps {
    readonly children: ReactNode
}

async function AuthenticatedShell({ children }: Readonly<{ children: ReactNode }>) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    if (!sessionCookie) redirect('/login')

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null)
    if (!decoded) redirect('/login')

    const profileSnap = await adminDb.collection('profiles').doc(decoded.uid).get()
    const profileData = profileSnap.exists ? profileSnap.data() : null
    const isOnboarded = !!(profileData?.onboardingCompletedAt)
    const displayName = (profileData?.displayName as string) ?? ''

    return (
        <>
            <PlatformNav displayName={displayName} />
            <main className="flex-1 min-w-0 px-4 md:px-8 pt-22 md:pt-8 pb-8">
                {!isOnboarded && <OnboardingModal />}
                <div className={isOnboarded ? '' : 'pointer-events-none select-none opacity-40'}>
                    {children}
                </div>
            </main>
        </>
    )
}

export default function PlatformLayout({ children }: Readonly<PlatformLayoutProps>) {
    return (
        <div className="min-h-screen flex">
            <Suspense>
                <AuthenticatedShell>{children}</AuthenticatedShell>
            </Suspense>
        </div>
    )
}
