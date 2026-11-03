import type { Metadata } from "next";

import { SignUpPage } from "../auth-pages";

export const metadata: Metadata = { title: "Đăng ký", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <SignUpPage next={typeof next === "string" ? next : undefined} />;
}
