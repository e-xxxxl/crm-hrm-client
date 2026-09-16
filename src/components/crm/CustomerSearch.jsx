import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { customers as api } from "../../services/crm.js";
import Spinner from "../ui/Spinner.jsx";

/**
 * Unified customer lookup — name, phone, email, customer id, or (once brand
 * modules are wired) order / tracking number.
 */
export default function CustomerSearch({ autoFocus = false }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(term, 250);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    api
      .search(debounced.trim())
      .then((res) => {
        if (!cancelled) {
          setResults(res.results || []);
          setOpen(true);
        }
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          className="input pl-9"
          placeholder="Search customers — name, phone, email, ID, order or tracking no."
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
            <Spinner size={14} />
          </span>
        )}
      </div>

      {open && debounced.trim().length >= 2 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-ink-200 bg-white shadow-card">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-ink-500">
              {loading ? "Searching…" : "No matches"}
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-ink-50"
                    onClick={() => {
                      setOpen(false);
                      setTerm("");
                      navigate(`/crm/customers/${r.id}`);
                    }}
                  >
                    <span className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-ink-900">{r.name}</span>
                      <span className="ml-2 shrink-0 text-2xs uppercase tracking-wide text-ink-400">
                        {r.matchedOn}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      {r.customerId} · {r.phone || r.email || "no contact"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
