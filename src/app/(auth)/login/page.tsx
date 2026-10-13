import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in - StayFinder" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-extrabold">Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="card mt-6 p-4 text-sm text-gray-600">
        <p className="mb-1 font-semibold">Demo accounts (password: password123)</p>
        <ul className="space-y-0.5">
          <li>customer1@demo.com - Customer</li>
          <li>owner1@demo.com - Hotel owner</li>
          <li>admin@demo.com - Admin</li>
        </ul>
      </div>
    </div>
  );
}
