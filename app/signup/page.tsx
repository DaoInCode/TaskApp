import type { Metadata } from "next";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <SignupForm />
    </div>
  );
}
