import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignOutUseCase } from "@/data/auth/use-cases/sign-out-use-case";

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  const uc = new SignOutUseCase();
  await uc.execute({ sessionCookie });

  cookieStore.delete("session");
  return NextResponse.json({ ok: true });
}
