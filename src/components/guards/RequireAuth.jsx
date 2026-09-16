import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth.js";
import Spinner from "../ui/Spinner.jsx";

/** Gate a subtree behind an authenticated session. */
export default function RequireAuth({ children }) {
  const status = useAuth((s) => s.status);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
