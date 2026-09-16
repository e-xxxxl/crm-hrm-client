import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth.js";
import Toaster from "./components/ui/Toaster.jsx";
import Spinner from "./components/ui/Spinner.jsx";
import RequireAuth from "./components/guards/RequireAuth.jsx";
import RequirePermission from "./components/guards/RequirePermission.jsx";

import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Security from "./pages/Security.jsx";
import HRMLayout from "./layouts/HRMLayout.jsx";

import CRMLayout from "./layouts/CRMLayout.jsx";

import HrOverview from "./pages/hrm/HrOverview.jsx";
import CrmOverview from "./pages/crm/CrmOverview.jsx";
import CustomerList from "./pages/crm/CustomerList.jsx";
import CustomerProfile from "./pages/crm/CustomerProfile.jsx";
import TicketList from "./pages/crm/TicketList.jsx";
import TicketDetail from "./pages/crm/TicketDetail.jsx";
import ShipmentList from "./pages/crm/ShipmentList.jsx";
import ShipmentDetail from "./pages/crm/ShipmentDetail.jsx";
import OrderList from "./pages/crm/OrderList.jsx";
import OrderDetail from "./pages/crm/OrderDetail.jsx";
import BusinessList from "./pages/crm/BusinessList.jsx";
import BusinessDetail from "./pages/crm/BusinessDetail.jsx";
import LeadBoard from "./pages/crm/LeadBoard.jsx";
import LeadDetail from "./pages/crm/LeadDetail.jsx";
import ReviewQueue from "./pages/crm/ReviewQueue.jsx";
import RiderList from "./pages/crm/RiderList.jsx";
import RiderDetail from "./pages/crm/RiderDetail.jsx";
import DispatchBoard from "./pages/crm/DispatchBoard.jsx";
import Tasks from "./pages/crm/Tasks.jsx";
import Sales from "./pages/crm/Sales.jsx";
import Reports from "./pages/crm/Reports.jsx";
import AuditLog from "./pages/shared/AuditLog.jsx";
import BrandSettings from "./pages/crm/BrandSettings.jsx";
import RiderLayout from "./layouts/RiderLayout.jsx";
import RiderHome from "./pages/rider/RiderHome.jsx";
import RiderJob from "./pages/rider/RiderJob.jsx";
import EmployeeList from "./pages/hrm/EmployeeList.jsx";
import EmployeeProfile from "./pages/hrm/EmployeeProfile.jsx";
import DepartmentList from "./pages/hrm/DepartmentList.jsx";
import BranchList from "./pages/hrm/BranchList.jsx";
import Attendance from "./pages/hrm/Attendance.jsx";
import Leave from "./pages/hrm/Leave.jsx";
import Payroll from "./pages/hrm/Payroll.jsx";
import Performance, { PerformanceReviewPage } from "./pages/hrm/Performance.jsx";
import Targets from "./pages/hrm/Targets.jsx";
import Recruitment, { JobPipelinePage } from "./pages/hrm/Recruitment.jsx";
import Documents from "./pages/hrm/Documents.jsx";
import Disciplinary from "./pages/hrm/Disciplinary.jsx";
import HrReports from "./pages/hrm/HrReports.jsx";
import HrSettings from "./pages/hrm/HrSettings.jsx";
import Notifications from "./pages/hrm/Notifications.jsx";

export default function App() {
  const { status, bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <>
      <Toaster />
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
          <Route index element={<HrOverview />} />
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
          <Route
            index
            element={
              <RequirePermission perm={["customer:read", "report:crm"]} mode="any">
                <CrmOverview />
              </RequirePermission>
            }
          />
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
    </>
  );
}

/** Send the user to whichever workspace their role can actually use. */
function LandingRedirect() {
  const canAny = useAuth((s) => s.canAny);
  const role = useAuth((s) => s.session?.role);
  if (role === "Rider") return <Navigate to="/rider" replace />;
  const hrm = canAny("employee:read", "attendance:read", "leave:read", "payroll:read", "payroll:read_own", "report:hr");
  const crm = canAny("customer:read", "ticket:read", "shipment:read", "lead:read", "report:crm");
  if (!hrm && crm) return <Navigate to="/crm" replace />;
  return <Navigate to="/hrm" replace />;
}
