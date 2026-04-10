import { getServerContext } from '@/lib/server-context'
import { ProfileClient } from '@/components/profile/profile-client'

export default async function ProfilePage() {
    const { uid, user } = await getServerContext()

    return (
        <ProfileClient
            initialDisplayName={(user?.displayName as string) ?? ''}
            uid={uid}
        />
    )
}
