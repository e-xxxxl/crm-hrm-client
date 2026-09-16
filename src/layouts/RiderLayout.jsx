import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.js";
import { riderPwa } from "../services/crm.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { toast } from "../store/toast.js";

/**
 * Standalone mobile-first shell for the rider app. No sidebar — a compact top
 * bar with an availability toggle and a periodic GPS ping.
 */
export default function RiderLayout() {
  const navigate = useNavigate();
  const { user, logout, session } = useAuth();
  const geo = useGeolocation();
  const [availability, setAvailability] = useState("offline");

  // Ping location every 60s while online.
  useEffect(() => {
    if (availability === "offline") return undefined;
    let stop = false;
    const ping = async () => {
      try {
        const pos = await geo.request();
        if (!stop) await riderPwa.location({ ...pos, availability });
      } catch {
        /* ignore a single failed fix */
      }
    };
    ping();
    const t = setInterval(ping, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability]);

  async function toggle(next) {
    try {
      await riderPwa.availability(next);
      setAvailability(next);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-ink-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
          <p className="truncate text-2xs text-ink-500">{session?.organizationName} · Rider</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-ink-200 px-2 py-1 text-xs font-medium"
            value={availability}
            onChange={(e) => toggle(e.target.value)}
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-ink-800"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="p-4">
        <Outlet context={{ availability }} />
      </main>
    </div>
  );
}
