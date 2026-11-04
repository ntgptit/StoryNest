import type { Metadata } from "next";

import { SignUpPage } from "../auth-pages";
import { appText } from "@/lib/strings";

export const metadata: Metadata = { title: appText.pageTitle.register, robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <SignUpPage next={typeof next === "string" ? next : undefined} />;
}
