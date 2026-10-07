import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth.js";
import { applyBrandTheme } from "./utils/brandTheme.js";
import Toaster from "./components/ui/Toaster.jsx";
import Spinner from "./components/ui/Spinner.jsx";
import RequireAuth from "./components/guards/RequireAuth.jsx";
import RequirePermission from "./components/guards/RequirePermission.jsx";

// Only the login page ships in the first bundle. Everything else is split into
// its own chunk and fetched on demand, so a cold load of /login (the most
// common first visit) downloads a fraction of the app.
import Login from "./pages/Login.jsx";

const page = (loader, named) =>
  lazy(() => (named ? loader().then((m) => ({ default: m[named] })) : loader()));

const ChangePassword = page(() => import("./pages/ChangePassword.jsx"));
const Security = page(() => import("./pages/Security.jsx"));
const HRMLayout = page(() => import("./layouts/HRMLayout.jsx"));
const CRMLayout = page(() => import("./layouts/CRMLayout.jsx"));
const RiderLayout = page(() => import("./layouts/RiderLayout.jsx"));

const HrOverview = page(() => import("./pages/hrm/HrOverview.jsx"));
const CrmOverview = page(() => import("./pages/crm/CrmOverview.jsx"));
const CustomerList = page(() => import("./pages/crm/CustomerList.jsx"));
const CustomerProfile = page(() => import("./pages/crm/CustomerProfile.jsx"));
const TicketList = page(() => import("./pages/crm/TicketList.jsx"));
const TicketDetail = page(() => import("./pages/crm/TicketDetail.jsx"));
const ShipmentList = page(() => import("./pages/crm/ShipmentList.jsx"));
const ShipmentDetail = page(() => import("./pages/crm/ShipmentDetail.jsx"));
const OrderList = page(() => import("./pages/crm/OrderList.jsx"));
const OrderDetail = page(() => import("./pages/crm/OrderDetail.jsx"));
const BusinessList = page(() => import("./pages/crm/BusinessList.jsx"));
const BusinessDetail = page(() => import("./pages/crm/BusinessDetail.jsx"));
const LeadBoard = page(() => import("./pages/crm/LeadBoard.jsx"));
const LeadDetail = page(() => import("./pages/crm/LeadDetail.jsx"));
const ReviewQueue = page(() => import("./pages/crm/ReviewQueue.jsx"));
const RiderList = page(() => import("./pages/crm/RiderList.jsx"));
const RiderDetail = page(() => import("./pages/crm/RiderDetail.jsx"));
const DispatchBoard = page(() => import("./pages/crm/DispatchBoard.jsx"));
const Tasks = page(() => import("./pages/crm/Tasks.jsx"));
const Sales = page(() => import("./pages/crm/Sales.jsx"));
const Invoices = page(() => import("./pages/crm/Invoices.jsx"));
const Emails = page(() => import("./pages/crm/Emails.jsx"));
const Reports = page(() => import("./pages/crm/Reports.jsx"));
const AuditLog = page(() => import("./pages/shared/AuditLog.jsx"));
const BrandSettings = page(() => import("./pages/crm/BrandSettings.jsx"));
const RiderHome = page(() => import("./pages/rider/RiderHome.jsx"));
const RiderJob = page(() => import("./pages/rider/RiderJob.jsx"));
const EmployeeList = page(() => import("./pages/hrm/EmployeeList.jsx"));
const EmployeeProfile = page(() => import("./pages/hrm/EmployeeProfile.jsx"));
const DepartmentList = page(() => import("./pages/hrm/DepartmentList.jsx"));
const BranchList = page(() => import("./pages/hrm/BranchList.jsx"));
const Attendance = page(() => import("./pages/hrm/Attendance.jsx"));
const Leave = page(() => import("./pages/hrm/Leave.jsx"));
const Payroll = page(() => import("./pages/hrm/Payroll.jsx"));
const Performance = page(() => import("./pages/hrm/Performance.jsx"));
const PerformanceReviewPage = page(() => import("./pages/hrm/Performance.jsx"), "PerformanceReviewPage");
const Targets = page(() => import("./pages/hrm/Targets.jsx"));
const Recruitment = page(() => import("./pages/hrm/Recruitment.jsx"));
const JobPipelinePage = page(() => import("./pages/hrm/Recruitment.jsx"), "JobPipelinePage");
const Documents = page(() => import("./pages/hrm/Documents.jsx"));
const Disciplinary = page(() => import("./pages/hrm/Disciplinary.jsx"));
const HrReports = page(() => import("./pages/hrm/HrReports.jsx"));
const HrSettings = page(() => import("./pages/hrm/HrSettings.jsx"));
const Notifications = page(() => import("./pages/hrm/Notifications.jsx"));

const FullPageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center text-ink-400">
    <Spinner size={24} />
  </div>
);

export default function App() {
  const { status, bootstrap } = useAuth();
  const organizationType = useAuth((s) => s.session?.organizationType);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    applyBrandTheme(organizationType);
  }, [organizationType]);

  if (status === "loading") return <FullPageSpinner />;

  return (
    <>
      <Toaster />
      <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/account/password"
          element={
            <RequireAuth>
              <ChangePassword />
            </RequireAuth>
          }
        />
        <Route
          path="/account/security"
          element={
            <RequireAuth>
              <Security />
            </RequireAuth>
          }
        />

        <Route
          path="/hrm"
          element={
            <RequireAuth>
              <HRMLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HrIndex />} />
          <Route
            path="employees"
            element={
              <RequirePermission perm="employee:read">
                <EmployeeList />
              </RequirePermission>
            }
          />
          <Route
            path="employees/:id"
            element={
              <RequirePermission perm="employee:read">
                <EmployeeProfile />
              </RequirePermission>
            }
          />
          <Route
            path="departments"
            element={
              <RequirePermission perm="department:read">
                <DepartmentList />
              </RequirePermission>
            }
          />
          <Route
            path="branches"
            element={
              <RequirePermission perm="branch:read">
                <BranchList />
              </RequirePermission>
            }
          />

          <Route
            path="attendance"
            element={
              <RequirePermission perm="attendance:read">
                <Attendance />
              </RequirePermission>
            }
          />

          <Route
            path="leave"
            element={
              <RequirePermission perm="leave:read">
                <Leave />
              </RequirePermission>
            }
          />

          <Route
            path="payroll"
            element={
              <RequirePermission perm={["payroll:read", "payroll:read_own"]} mode="any">
                <Payroll />
              </RequirePermission>
            }
          />

          <Route
            path="performance"
            element={
              <RequirePermission perm="performance:read">
                <Performance />
              </RequirePermission>
            }
          />
          <Route
            path="performance/:id"
            element={
              <RequirePermission perm="performance:read">
                <PerformanceReviewPage />
              </RequirePermission>
            }
          />
          <Route
            path="targets"
            element={
              <RequirePermission perm="target:read">
                <Targets />
              </RequirePermission>
            }
          />
          <Route
            path="recruitment"
            element={
              <RequirePermission perm="recruitment:read">
                <Recruitment />
              </RequirePermission>
            }
          />
          <Route
            path="recruitment/jobs/:id"
            element={
              <RequirePermission perm="recruitment:read">
                <JobPipelinePage />
              </RequirePermission>
            }
          />
          <Route
            path="documents"
            element={
              <RequirePermission perm="document:read">
                <Documents />
              </RequirePermission>
            }
          />
          <Route
            path="disciplinary"
            element={
              <RequirePermission perm="disciplinary:read">
                <Disciplinary />
              </RequirePermission>
            }
          />
          <Route
            path="notifications"
            element={
              <RequirePermission perm="notification:read">
                <Notifications />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission perm="report:hr">
                <HrReports />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission perm="settings:read">
                <HrSettings />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission perm="audit:read">
                <AuditLog />
              </RequirePermission>
            }
          />
        </Route>

        <Route
          path="/crm"
          element={
            <RequireAuth>
              <CRMLayout />
            </RequireAuth>
          }
        >
          <Route index element={<CrmIndex />} />
          <Route
            path="customers"
            element={
              <RequirePermission perm="customer:read">
                <CustomerList />
              </RequirePermission>
            }
          />
          <Route
            path="customers/:id"
            element={
              <RequirePermission perm="customer:read">
                <CustomerProfile />
              </RequirePermission>
            }
          />
          <Route
            path="tickets"
            element={
              <RequirePermission perm="ticket:read">
                <TicketList />
              </RequirePermission>
            }
          />
          <Route
            path="tickets/:id"
            element={
              <RequirePermission perm="ticket:read">
                <TicketDetail />
              </RequirePermission>
            }
          />

          <Route path="tasks" element={<RequirePermission perm="task:read"><Tasks /></RequirePermission>} />
          <Route path="invoices" element={<RequirePermission perm="invoice:read"><Invoices /></RequirePermission>} />
          <Route path="emails" element={<RequirePermission perm="communication:write"><Emails /></RequirePermission>} />
          <Route path="sales" element={<RequirePermission perm="report:crm"><Sales /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission perm="report:crm"><Reports /></RequirePermission>} />
          <Route path="audit" element={<RequirePermission perm="audit:read"><AuditLog /></RequirePermission>} />

          {/* AJCL — courier */}
          <Route path="shipments" element={<RequirePermission perm="shipment:read"><ShipmentList /></RequirePermission>} />
          <Route path="shipments/:id" element={<RequirePermission perm="shipment:read"><ShipmentDetail /></RequirePermission>} />

          {/* QuickShipAfrica — logistics */}
          <Route path="orders" element={<RequirePermission perm="order:read"><OrderList /></RequirePermission>} />
          <Route path="orders/:id" element={<RequirePermission perm="order:read"><OrderDetail /></RequirePermission>} />

          {/* 9jaTradiesPages — marketplace */}
          <Route path="businesses" element={<RequirePermission perm="business:read"><BusinessList /></RequirePermission>} />
          <Route path="businesses/:id" element={<RequirePermission perm="business:read"><BusinessDetail /></RequirePermission>} />
          <Route path="leads" element={<RequirePermission perm="lead:read"><LeadBoard /></RequirePermission>} />
          <Route path="leads/:id" element={<RequirePermission perm="lead:read"><LeadDetail /></RequirePermission>} />
          <Route path="reviews" element={<RequirePermission perm="review:read"><ReviewQueue /></RequirePermission>} />

          {/* Rider & dispatch (courier + logistics) */}
          <Route path="dispatch" element={<RequirePermission perm={["shipment:dispatch", "order:dispatch", "rider:write"]} mode="any"><DispatchBoard /></RequirePermission>} />
          <Route path="riders" element={<RequirePermission perm="rider:read"><RiderList /></RequirePermission>} />
          <Route path="riders/:id" element={<RequirePermission perm="rider:read"><RiderDetail /></RequirePermission>} />

          <Route
            path="brand"
            element={
              <RequirePermission perm={["settings:write", "org:read"]} mode="any">
                <BrandSettings />
              </RequirePermission>
            }
          />
        </Route>

        <Route
          path="/rider"
          element={
            <RequireAuth>
              <RiderLayout />
            </RequireAuth>
          }
        >
          <Route index element={<RequirePermission perm="rider:job"><RiderHome /></RequirePermission>} />
          <Route path="jobs/:id" element={<RequirePermission perm="rider:job"><RiderJob /></RequirePermission>} />
        </Route>

        <Route path="/" element={<LandingRedirect />} />
        <Route path="*" element={<LandingRedirect />} />
      </Routes>
      </Suspense>
    </>
  );
}

/** Send the user to whichever workspace their role can actually use. */
function LandingRedirect() {
  const canAny = useAuth((s) => s.canAny);
  const role = useAuth((s) => s.session?.role);
  if (role === "Rider") return <Navigate to="/rider" replace />;
  // Rank-and-file staff land on their own attendance (clock in/out) rather
  // than the management overview dashboard, which they can't act on anyway.
  if (role === "Staff") return <Navigate to="/hrm/attendance" replace />;
  const hrm = canAny("employee:read", "attendance:read", "leave:read", "payroll:read", "payroll:read_own", "report:hr");
  const crm = canAny("customer:read", "ticket:read", "shipment:read", "lead:read", "report:crm");
  if (!hrm && crm) return <Navigate to="/crm" replace />;
  return <Navigate to="/hrm" replace />;
}

/**
 * The `/hrm` index route itself — not just the initial "/" redirect — needs
 * this same role check. Anyone can land here directly (bookmark, the HRM/CRM
 * WorkspaceSwitcher button, browser back/forward), and HrOverview's data
 * comes from an endpoint gated to employee:read/report:hr, which rank-and-
 * file roles (Staff, Rider) don't hold — they'd otherwise hit a permanent
 * "Could not load the overview" error instead of their own attendance page.
 */
function HrIndex() {
  const canOverview = useAuth((s) => s.canAny("employee:read", "report:hr"));
  const canAttendance = useAuth((s) => s.can("attendance:read"));
  if (!canOverview && canAttendance) return <Navigate to="/hrm/attendance" replace />;
  return <HrOverview />;
}

/**
 * Same idea as HrIndex, on the CRM side — HR Manager can reach the CRM
 * workspace to edit riders (rider:read/write) but has neither
 * customer:read nor report:crm, so the overview would otherwise 403.
 */
function CrmIndex() {
  const canOverview = useAuth((s) => s.canAny("customer:read", "report:crm"));
  const canRiders = useAuth((s) => s.can("rider:read"));
  if (!canOverview && canRiders) return <Navigate to="/crm/riders" replace />;
  return (
    <RequirePermission perm={["customer:read", "report:crm"]} mode="any">
      <CrmOverview />
    </RequirePermission>
  );
}
