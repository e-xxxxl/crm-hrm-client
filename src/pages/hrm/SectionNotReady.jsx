import PageHeader from "../../components/ui/PageHeader.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

/**
 * Shown for HRM sections that are enabled in navigation but whose build phase is
 * still in progress. It is an honest state — no sample data, no mock UI — and is
 * replaced by the real page as each phase lands.
 */
export default function SectionNotReady({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title="This section is being rolled out"
        description="The data model and API for this module are in progress. It will become available in an upcoming release."
      />
    </>
  );
}
