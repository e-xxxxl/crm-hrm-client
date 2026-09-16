import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.js";
import { notifications as api } from "../../services/hrm.js";
import { fromNow } from "../../utils/format.js";

/**
 * Header notifications control. Polls the unread count every 60s and loads the
 * list on open. Uses a subtle count badge — no animation, no colour flash.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const enabled = can("notification:read");

  const loadCount = useCallback(async () => {
    try {
      setUnread(await api.unreadCount());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadCount();
    const t = setInterval(loadCount, 60_000);
    return () => clearInterval(t);
  }, [enabled, loadCount]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await api.list({ limit: 8 });
        setItems(res.data || []);
        setUnread(res.unread ?? 0);
      } finally {
        setLoading(false);
      }
    }
  }

  async function openItem(n) {
    if (!n.read) {
      try {
        await api.markRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
        setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    await api.markAllRead();
    setUnread(0);
    setItems((list) => list.map((x) => ({ ...x, read: true })));
  }

  if (!enabled) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-md p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-ink-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <span className="text-sm font-medium text-ink-900">Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-brand-600 hover:text-brand-700">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-ink-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-500">No notifications</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`block w-full px-3 py-2.5 text-left hover:bg-ink-50 ${
                        n.read ? "" : "bg-brand-600/[0.04]"
                      }`}
                    >
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-ink-600">{n.body}</p>}
                      <p className="mt-0.5 text-2xs text-ink-400">{fromNow(n.createdAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/hrm/notifications");
            }}
            className="block w-full border-t border-ink-100 px-3 py-2 text-center text-xs font-medium text-ink-600 hover:bg-ink-50"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
