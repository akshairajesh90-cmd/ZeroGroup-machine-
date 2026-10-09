import { requireAuth } from "@/lib/serverAuth";
import LiveMap from "@/components/LiveMap";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DriverLiveMapPage() {
  const { role } = await requireAuth();

  // For security, only allow drivers or staff/owners
  if (role !== "DRIVER" && role !== "STAFF" && role !== "OWNER" && role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="bg-zinc-950 min-h-screen font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/60 border-b border-zinc-800/80 p-4">
        <h1 className="text-xl font-black text-white">Live Route Map</h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
          Crew Tracking & Operations
        </p>
      </header>
      
      {/* We reuse the admin map engine here */}
      <div className="h-[calc(100vh-theme(spacing.20))]">
        <LiveMap sites={[]} />
      </div>
    </div>
  );
}
