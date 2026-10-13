import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Register - StayFinder" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join StayFinder to book stays or list your own hotel."
      sideTitle="Your next stay starts here"
      sideText="Create a free account to compare rooms, book with live availability and keep every reservation in one place."
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
