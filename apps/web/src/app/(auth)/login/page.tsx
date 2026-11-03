import type { Metadata } from "next";

import { SignInPage } from "../auth-pages";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const { next, error } = await searchParams;
  return <SignInPage next={typeof next === "string" ? next : undefined} callbackFailed={error === "callback"} />;
}
