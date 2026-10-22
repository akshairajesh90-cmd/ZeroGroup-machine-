import { requireAuth } from "@/lib/serverAuth";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const LiveMap = nextDynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center">
      <span className="text-zinc-500 font-medium text-xs">Loading Live Route Map...</span>
    </div>
  ),
});

export default async function DriverLiveMapPage() {
  const { role } = await requireAuth();

  // For security, only allow drivers or staff/owners
  if (role !== "DRIVER" && role !== "STAFF" && role !== "OWNER" && role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-black text-white">Live Route Map</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Crew Tracking & Operations
        </p>
      </div>
      
      {/* Map Container */}
      <div className="h-[calc(100dvh-13rem)] min-h-[380px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <LiveMap sites={[]} />
      </div>
    </div>
  );
}
