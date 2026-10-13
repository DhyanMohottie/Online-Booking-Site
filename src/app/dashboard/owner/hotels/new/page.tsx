import Link from "next/link";
import HotelForm from "@/components/HotelForm";

export const metadata = { title: "Register a hotel - StayFinder" };

export default function NewHotelPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard/owner" className="text-sm text-brand hover:underline">← Back to my hotels</Link>
      <h1 className="text-2xl font-extrabold">Register a hotel</h1>
      <p className="text-sm text-gray-600">
        Your hotel will be reviewed by an admin before it appears in search. You can add room types right after saving.
      </p>
      <HotelForm />
    </div>
  );
}
