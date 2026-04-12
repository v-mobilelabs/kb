import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { cache } from "react";

export const getServerContext = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login");

  const decoded = await adminAuth
    .verifySessionCookie(sessionCookie, true)
    .catch(() => null);

  if (!decoded) redirect("/login");

  const profileSnap = await adminDb
    .collection("profiles")
    .doc(decoded.uid)
    .get();
  const profileData = profileSnap.data();
  const orgId = profileData?.orgId as string | undefined;

  return {
    uid: decoded.uid,
    orgId,
    user: profileData,
  };
});
