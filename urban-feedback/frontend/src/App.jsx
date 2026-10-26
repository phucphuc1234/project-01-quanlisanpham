import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { useApiData, useAuth, useToast } from "./lib/context";
import { initials, roleLabels } from "./lib/utils";
import { LoadingState } from "./components/ui";
const HomePage = lazy(() => import("./pages/Home"));
const AuthPage = lazy(() => import("./pages/Auth"));
const ReportDetailPage = lazy(() => import("./pages/ReportDetail"));
const reportPage = (name) =>
  lazy(() =>
    import("./pages/Reports").then((module) => ({ default: module[name] })),
  );
const managementPage = (name) =>
  lazy(() =>
    import("./pages/Management").then((module) => ({ default: module[name] })),
  );
const DashboardPage = reportPage("DashboardPage"),
  NewReportPage = reportPage("NewReportPage"),
  ReportsPage = reportPage("ReportsPage");
const AdminPage = managementPage("AdminPage"),
  NotificationsPage = managementPage("NotificationsPage"),
  ReopensPage = managementPage("ReopensPage"),
  StatisticsPage = managementPage("StatisticsPage");

function Brand({ light = false, onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`brand ${light ? "brand-light" : ""}`}
    >
      <span className="brand-icon">
        <Sprout size={25} strokeWidth={1.8} />
      </span>
      <span>
        Đô thị <b>Kết nối</b>
        <small>CÙNG XÂY THÀNH PHỐ ĐÁNG SỐNG</small>
      </span>
    </Link>
  );
}
function NotificationsButton() {
  const resource = useApiData("/notifications");
  useEffect(() => {
    window.addEventListener("notifications-updated", resource.reload);
    const timer = setInterval(resource.reload, 60000);
    return () => {
      window.removeEventListener("notifications-updated", resource.reload);
      clearInterval(timer);
    };
  }, [resource.reload]);
  return (
    <Link
      className="notification-button icon-btn"
      to="/notifications"
      aria-label={`Thông báo${resource.data?.unread ? `, ${resource.data.unread} chưa đọc` : ""}`}
    >
      <Bell size={21} />
      {resource.data?.unread > 0 && (
        <span>{resource.data.unread > 9 ? "9+" : resource.data.unread}</span>
      )}
    </Link>
  );
}
function Protected({ roles }) {
  const { user, loading } = useAuth(),
    location = useLocation();
  if (loading) return <LoadingState />;
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (roles && !roles.includes(user.role))
    return (
      <div className="panel empty-state">
        <ShieldCheck size={36} />
        <h1>Bạn chưa có quyền truy cập</h1>
        <p>Chức năng này dành cho vai trò được phân công.</p>
        <Link className="btn btn-primary" to="/dashboard">
          Về bảng điều khiển
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  return <Outlet />;
}
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand light />
          <p>
            Nền tảng kết nối người dân và chính quyền.
            <br />
            Cùng chung tay xây dựng đô thị xanh, an toàn và đáng sống.
          </p>
        </div>
        <div>
          <strong>Khám phá</strong>
          <Link to="/reports">Phản ánh cộng đồng</Link>
          <Link to="/reports/new">Gửi phản ánh mới</Link>
          <a href="/#how-it-works">Quy trình xử lý</a>
        </div>
        <div>
          <strong>Đồng hành cùng bạn</strong>
          <Link to="/my-reports">Theo dõi phản ánh</Link>
          <Link to="/notifications">Thông báo của bạn</Link>
          <Link to="/register">Tham gia cộng đồng</Link>
        </div>
        <div className="footer-trust">
          <ShieldCheck size={25} />
          <strong>Kết nối có trách nhiệm</strong>
          <p>Dữ liệu cá nhân được bảo vệ. Tiến độ xử lý minh bạch.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Đô thị Kết nối. Vì một thành phố đáng
          sống.
        </span>
        <span>
          Được xây dựng từ tiếng nói cộng đồng <Sprout size={14} />
        </span>
      </div>
    </footer>
  );
}
function SiteLayout() {
  const { user, logout } = useAuth(),
    toast = useToast(),
    location = useLocation(),
    navigate = useNavigate(),
    [menu, setMenu] = useState(false);
  const isWorkspace = Boolean(user) && location.pathname !== "/";
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  const signOut = async () => {
    try {
      await logout();
      navigate("/");
      toast("Bạn đã đăng xuất.");
    } catch (error) {
      toast(error.message, "error");
    }
  };
  const links = [
    {
      to: "/dashboard",
      icon: LayoutDashboard,
      label: "Tổng quan",
      roles: ["VT01", "VT02", "VT03", "VT04", "VT05"],
    },
    {
      to: "/my-reports",
      icon: ClipboardList,
      label: "Phản ánh của tôi",
      roles: ["VT01"],
    },
    {
      to: "/reports/new",
      icon: Plus,
      label: "Gửi phản ánh mới",
      roles: ["VT01", "VT05"],
    },
    {
      to: "/intake",
      icon: ClipboardCheck,
      label: "Tiếp nhận & phân loại",
      roles: ["VT02", "VT05"],
    },
    {
      to: "/assignments",
      icon: Send,
      label: "Phân công xử lý",
      roles: ["VT02", "VT05"],
    },
    {
      to: "/tasks",
      icon: ClipboardList,
      label: "Nhiệm vụ xử lý",
      roles: ["VT03", "VT05"],
    },
    {
      to: "/acceptance",
      icon: FileCheck2,
      label: "Nghiệm thu kết quả",
      roles: ["VT04", "VT05"],
    },
    {
      to: "/reopens",
      icon: RotateCcw,
      label: "Yêu cầu xem xét lại",
      roles: ["VT02", "VT04", "VT05"],
    },
    {
      to: "/admin",
      icon: Settings2,
      label: "Quản trị hệ thống",
      roles: ["VT05"],
    },
    {
      to: "/statistics",
      icon: ChartNoAxesCombined,
      label: "Báo cáo thống kê",
      roles: ["VT05"],
    },
    {
      to: "/notifications",
      icon: Bell,
      label: "Thông báo",
      roles: ["VT01", "VT02", "VT03", "VT04", "VT05"],
    },
  ];
  if (isWorkspace)
    return (
      <div className="app-shell">
        {menu && (
          <button
            className="sidebar-overlay"
            aria-label="Đóng menu"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={`app-sidebar ${menu ? "open" : ""}`}>
          <div className="sidebar-inner">
            <div className="sidebar-brand">
              <Brand />
              <button
                className="icon-btn sidebar-close"
                aria-label="Đóng menu"
                onClick={() => setMenu(false)}
              >
                <X size={20} />
              </button>
            </div>
            <span className="sidebar-section">KHÔNG GIAN LÀM VIỆC</span>
            <nav className="sidebar-nav" aria-label="Điều hướng chức năng">
              {links
                .filter((item) => item.roles.includes(user.role))
                .map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                  </NavLink>
                ))}
            </nav>
            <div className="sidebar-bottom">
              <Link className="sidebar-link" to="/reports">
                <Map size={19} />
                Khám phá phản ánh
                <ArrowUpRight size={14} />
              </Link>
              <Link className="sidebar-link" to="/">
                <Home size={19} />
                Về trang chủ
              </Link>
              <div className="sidebar-profile">
                <span className="avatar">{initials(user.name)}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{roleLabels[user.role]}</small>
                </div>
                <button
                  className="icon-btn"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  onClick={signOut}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </aside>
        <div className="app-main">
          <header className="app-topbar">
            <div>
              <button
                className="icon-btn mobile-toggle"
                aria-label="Mở menu"
                onClick={() => setMenu(true)}
              >
                <Menu size={23} />
              </button>
              <span className="topbar-breadcrumb">
                Không gian làm việc
                <ChevronRight size={14} />
                <strong>
                  {links.find((item) => location.pathname === item.to)?.label ||
                    "Phản ánh"}
                </strong>
              </span>
            </div>
            <div className="topbar-user">
              <span className="online-tag">
                <Sprout size={14} />
                Cùng xây thành phố đáng sống
              </span>
              <NotificationsButton />
              <span className="avatar avatar-small">{initials(user.name)}</span>
            </div>
          </header>
          <main className="app-content">
            <Outlet />
          </main>
          <div className="app-bottom-note">
            <ShieldCheck size={13} />
            Thông tin cá nhân được bảo vệ · Đô thị Kết nối
          </div>
        </div>
      </div>
    );
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="public-nav" aria-label="Điều hướng chính">
            <NavLink to="/" end>
              Trang chủ
            </NavLink>
            <NavLink to="/reports">Khám phá phản ánh</NavLink>
            <a href="/#how-it-works">Cách hoạt động</a>
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <NotificationsButton />
                <Link className="btn btn-primary btn-sm" to="/dashboard">
                  Bảng điều khiển
                  <ArrowUpRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <Link className="header-login" to="/login">
                  Đăng nhập
                </Link>
                <Link className="btn btn-primary btn-sm" to="/register">
                  Tham gia ngay
                  <ArrowUpRight size={16} />
                </Link>
              </>
            )}
            <button
              className="icon-btn mobile-toggle"
              aria-label={menu ? "Đóng menu" : "Mở menu"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-menu">
            <Link to="/">Trang chủ</Link>
            <Link to="/reports">Khám phá phản ánh</Link>
            <Link to="/reports/new">Gửi phản ánh mới</Link>
            <Link to={user ? "/dashboard" : "/login"}>
              {user ? "Bảng điều khiển" : "Đăng nhập"}
            </Link>
          </nav>
        )}
      </header>
      <main
        className={
          location.pathname === "/"
            ? "public-main"
            : "public-main container public-page"
        }
      >
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 — TRANG KHÔNG TỒN TẠI</span>
      <h1>Có vẻ bạn đã đi lạc.</h1>
      <p>Quay lại trang chủ để tiếp tục kết nối với thành phố.</p>
      <Link className="btn btn-primary" to="/">
        Về trang chủ
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage registerMode />} />
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route element={<Protected roles={["VT01", "VT05"]} />}>
            <Route path="/reports/new" element={<NewReportPage />} />
          </Route>
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route element={<Protected />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-reports" element={<ReportsPage mode="mine" />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route element={<Protected roles={["VT02", "VT05"]} />}>
            <Route path="/intake" element={<ReportsPage mode="intake" />} />
            <Route
              path="/assignments"
              element={<ReportsPage mode="assignments" />}
            />
          </Route>
          <Route element={<Protected roles={["VT03", "VT05"]} />}>
            <Route path="/tasks" element={<ReportsPage mode="tasks" />} />
          </Route>
          <Route element={<Protected roles={["VT04", "VT05"]} />}>
            <Route
              path="/acceptance"
              element={<ReportsPage mode="acceptance" />}
            />
          </Route>
          <Route element={<Protected roles={["VT02", "VT04", "VT05"]} />}>
            <Route path="/reopens" element={<ReopensPage />} />
          </Route>
          <Route element={<Protected roles={["VT05"]} />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
