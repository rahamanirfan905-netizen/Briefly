import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="container">
      <Suspense><AuthForm mode="login" /></Suspense>
    </div>
  );
}
