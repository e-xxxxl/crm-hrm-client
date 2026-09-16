export default function Pagination({ meta, onPage }) {
  if (!meta) return null;
  const { page, pages, total, limit } = meta;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-ink-500 sm:flex-row">
      <p>
        {start}&ndash;{end} of {total.toLocaleString("en-NG")}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary !w-auto px-2.5 py-1.5 text-xs"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 text-xs">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn-secondary !w-auto px-2.5 py-1.5 text-xs"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
