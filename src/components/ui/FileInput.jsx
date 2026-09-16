import { useRef, useState } from "react";
import Spinner from "./Spinner.jsx";
import { uploadFile } from "../../services/hrm.js";

/**
 * Upload control. Handles the multipart POST and calls `onUploaded({id,url,...})`.
 * Shows the current file name once uploaded.
 */
export default function FileInput({ label, purpose = "document", value, onUploaded, accept, error }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  async function handle(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError(null);
    try {
      const result = await uploadFile(file, purpose);
      onUploaded(result, file);
    } catch (err) {
      setLocalError(err.message || "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary !w-auto"
          disabled={busy}
          onClick={() => ref.current?.click()}
        >
          {busy ? <Spinner size={14} /> : null}
          {value ? "Replace file" : "Choose file"}
        </button>
        {value && <span className="truncate text-xs text-ink-600">{value.name || value.originalName || "Uploaded"}</span>}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept || ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"}
        className="hidden"
        onChange={handle}
      />
      {(error || localError) && <p className="mt-1 text-xs text-red-600">{error || localError}</p>}
    </div>
  );
}
