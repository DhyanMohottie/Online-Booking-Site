import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HotelForm from "@/components/HotelForm";

export const metadata = { title: "Register a hotel - StayFinder" };

export default function NewHotelPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/owner"
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:text-brand"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to my hotels
      </Link>
      <div>
        <h1 className="text-3xl text-ink">Register a hotel</h1>
        <p className="mt-2 text-base text-gray-600">
          Your hotel will be reviewed by an admin before it appears in search. You can add room types right after saving.
        </p>
      </div>
      <HotelForm />
    </div>
  );
}
