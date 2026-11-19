import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="container">
      <Suspense><AuthForm mode="signup" /></Suspense>
    </div>
  );
}
