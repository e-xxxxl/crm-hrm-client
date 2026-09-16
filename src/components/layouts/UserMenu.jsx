import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.js";

export default function UserMenu({ name, email, role, avatar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 hover:bg-ink-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200 text-2xs font-semibold text-ink-700">
          {avatar || "?"}
        </span>
        <svg
          className="hidden text-ink-400 sm:block"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-md border border-ink-200 bg-white shadow-card"
        >
          <div className="border-b border-ink-100 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">{email}</p>
            <p className="mt-0.5 text-2xs uppercase tracking-wide text-ink-400">{role}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/account/security");
            }}
            className="block w-full px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
          >
            Security &amp; sessions
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/account/password");
            }}
            className="block w-full px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
          >
            Change password
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
