import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Register - StayFinder" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-extrabold">Create your account</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
