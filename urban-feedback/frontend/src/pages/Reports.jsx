import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Filter,
  ImagePlus,
  LayoutGrid,
  List,
  LocateFixed,
  Map,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Timer,
  UploadCloud,
  X,
} from "lucide-react";
import { api, queryString, uploadFiles } from "../lib/api";
import { useApiData, useAuth, useMeta, useToast } from "../lib/context";
import { dateLabel, numberLabel, roleLabels, statusLabels } from "../lib/utils";
import {
  EmptyState,
  ErrorState,
  Field,
  InlineAlert,
  LoadingState,
  PageHeading,
  StatusBadge,
} from "../components/ui";
import ReportCard from "../components/ReportCard";
import LocationMap from "../components/LocationMap";

const queueConfig = {
  all: {
    title: "Khám phá phản ánh",
    description:
      "Theo dõi những vấn đề hạ tầng và kết quả xử lý trong cộng đồng.",
  },
  mine: {
    title: "Phản ánh của tôi",
    description:
      "Mỗi phản ánh đều được lắng nghe. Theo dõi tiến độ và kết quả tại đây.",
  },
  intake: {
    title: "Tiếp nhận & phân loại",
    description:
      "Xác minh phản ánh mới, kiểm tra trùng và xác định mức độ ưu tiên.",
    status: "SUBMITTED",
  },
  assignments: {
    title: "Phân công xử lý",
    description: "Chuyển phản ánh đã xác minh đến đúng đơn vị phụ trách.",
    status: "VERIFIED",
  },
  tasks: {
    title: "Nhiệm vụ xử lý",
    description:
      "Tiếp nhận nhiệm vụ, cập nhật tiến độ và gửi kết quả nghiệm thu.",
  },
  acceptance: {
    title: "Nghiệm thu kết quả",
    description:
      "Đối chiếu bằng chứng trước, sau và xác nhận chất lượng xử lý.",
    status: "WAITING_ACCEPTANCE",
  },
};
export function ReportsPage({ mode = "all" }) {
  const { user } = useAuth(),
    { meta } = useMeta(),
    [params, setParams] = useSearchParams(),
    config = queueConfig[mode] || queueConfig.all;
  const [filters, setFilters] = useState({
      search: params.get("search") || "",
      status: params.get("status") || config.status || "",
      categoryId: "",
      unitId: "",
      page: 1,
    }),
    [draft, setDraft] = useState(params.get("search") || ""),
    [view, setView] = useState("grid");
  useEffect(() => {
    setFilters({
      search: params.get("search") || "",
      status: params.get("status") || config.status || "",
      categoryId: "",
      unitId: "",
      page: 1,
    });
    setDraft(params.get("search") || "");
  }, [mode, params.get("status")]);
  const data = useApiData(
    `/reports?${queryString({ ...filters, pageSize: 12, mine: mode === "mine" ? true : undefined })}`,
  );
  const update = (key, value) =>
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  const items = data.data?.items || [],
    total = data.data?.total || 0,
    totalPages = Math.max(1, Math.ceil(total / 12));
  return (
    <>
      <PageHeading
        eyebrow={mode === "all" ? "KHÔNG GIAN CỘNG ĐỒNG" : "QUẢN LÝ PHẢN ÁNH"}
        title={config.title}
        description={config.description}
        actions={
          !user || ["VT01", "VT05"].includes(user.role) ? (
            <Link className="btn btn-primary" to="/reports/new">
              <Plus size={18} />
              Gửi phản ánh
            </Link>
          ) : null
        }
      />
      <div className="panel reports-toolbar">
        <form
          className="search-input"
          onSubmit={(event) => {
            event.preventDefault();
            update("search", draft);
          }}
        >
          <Search size={18} />
          <input
            aria-label="Tìm phản ánh"
            placeholder="Tìm theo tiêu đề, mã hoặc địa điểm…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit">
            Tìm kiếm
          </button>
        </form>
        <div className="filter-grid">
          <Field label="Trạng thái">
            <select
              className="select"
              value={filters.status}
              onChange={(event) => update("status", event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lĩnh vực">
            <select
              className="select"
              value={filters.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="">Tất cả lĩnh vực</option>
              {meta.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Đơn vị xử lý">
            <select
              className="select"
              value={filters.unitId}
              onChange={(event) => update("unitId", event.target.value)}
            >
              <option value="">Tất cả đơn vị</option>
              {meta.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="filter-reset">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setDraft("");
                setFilters({
                  search: "",
                  status: config.status || "",
                  categoryId: "",
                  unitId: "",
                  page: 1,
                });
                setParams({});
              }}
            >
              <X size={15} />
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>
      <div className="reports-results-header">
        <p>
          <strong>{numberLabel(total)}</strong> phản ánh{" "}
          {filters.search && <>phù hợp với “{filters.search}”</>}
        </p>
        <div className="view-toggle">
          <button
            aria-label="Xem dạng lưới"
            title="Dạng lưới"
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            aria-label="Xem dạng danh sách"
            title="Danh sách"
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={17} />
          </button>
          <button
            aria-label="Xem trên bản đồ"
            title="Bản đồ"
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            <Map size={17} />
          </button>
        </div>
      </div>
      {data.loading ? (
        <LoadingState />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : !items.length ? (
        <EmptyState
          title={
            mode === "mine"
              ? "Bạn chưa có phản ánh nào"
              : "Chưa có phản ánh phù hợp"
          }
          description={
            mode === "mine"
              ? "Hãy gửi phản ánh đầu tiên để cùng cải thiện không gian sống."
              : "Thử thay đổi bộ lọc hoặc quay lại sau khi có dữ liệu mới."
          }
          actions={
            mode === "mine" ? (
              <Link className="btn btn-primary" to="/reports/new">
                <Plus size={17} />
                Gửi phản ánh đầu tiên
              </Link>
            ) : undefined
          }
        />
      ) : view === "map" ? (
        <div className="panel">
          <LocationMap points={items} height={520} />
          <div className="privacy-note">
            <ShieldCheck size={16} />
            {user
              ? "Chỉ các vị trí thuộc quyền truy cập của bạn được hiển thị."
              : "Tọa độ chính xác được ẩn để bảo vệ quyền riêng tư. Đăng nhập để theo dõi phản ánh của bạn."}
          </div>
        </div>
      ) : view === "list" ? (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Phản ánh</th>
                <th>Lĩnh vực</th>
                <th>Trạng thái</th>
                <th>Ngày gửi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((report) => (
                <tr key={report.id}>
                  <td>
                    <Link className="table-title" to={`/reports/${report.id}`}>
                      {report.title}
                    </Link>
                    <small className="table-subtitle">{report.address}</small>
                  </td>
                  <td>{report.categoryName}</td>
                  <td>
                    <StatusBadge status={report.status} />
                  </td>
                  <td>{dateLabel(report.createdAt)}</td>
                  <td>
                    <Link
                      className="icon-btn"
                      aria-label={`Chi tiết ${report.title}`}
                      to={`/reports/${report.id}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="reports-grid">
          {items.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="pagination">
          <span>
            Trang {filters.page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={filters.page === 1}
            onClick={() => update("page", filters.page - 1)}
          >
            <ChevronLeft size={16} />
            Trước
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={filters.page >= totalPages}
            onClick={() => update("page", filters.page + 1)}
          >
            Sau
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {!user && (
        <div className="privacy-note">
          <ShieldCheck size={16} />
          Chỉ công khai phản ánh đã nghiệm thu. Thông tin người gửi được bảo vệ.
        </div>
      )}
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuth(),
    isCitizen = user.role === "VT01";
  const stats = useApiData(`/stats${isCitizen ? "?mine=true" : ""}`),
    reports = useApiData(`/reports?pageSize=5${isCitizen ? "&mine=true" : ""}`);
  const shortcuts =
    user.role === "VT01"
      ? [
          [
            "/reports/new",
            Plus,
            "Gửi phản ánh mới",
            "Chụp ảnh và ghi nhận vấn đề",
          ],
          [
            "/my-reports",
            ClipboardList,
            "Phản ánh của tôi",
            "Theo dõi tiến độ xử lý",
          ],
          [
            "/notifications",
            MessageSquare,
            "Thông báo",
            "Cập nhật mới dành cho bạn",
          ],
        ]
      : user.role === "VT03"
        ? [
            [
              "/tasks",
              ClipboardList,
              "Nhiệm vụ được giao",
              "Tiếp nhận và cập nhật tiến độ",
            ],
            [
              "/tasks?status=IN_PROGRESS",
              Timer,
              "Đang xử lý",
              "Hoàn thành công việc đúng hạn",
            ],
            [
              "/notifications",
              MessageSquare,
              "Thông báo",
              "Theo dõi thay đổi nhiệm vụ",
            ],
          ]
        : user.role === "VT04"
          ? [
              [
                "/acceptance",
                FileCheck2,
                "Chờ nghiệm thu",
                "Kiểm tra và xác nhận kết quả",
              ],
              [
                "/reopens",
                MessageSquare,
                "Yêu cầu xem xét lại",
                "Lắng nghe phản hồi của người dân",
              ],
              [
                "/notifications",
                MessageSquare,
                "Thông báo",
                "Cập nhật mới dành cho bạn",
              ],
            ]
          : [
              [
                "/intake",
                ClipboardList,
                "Tiếp nhận phản ánh",
                "Kiểm tra và phân loại phản ánh",
              ],
              [
                "/assignments",
                Send,
                "Phân công xử lý",
                "Chuyển tới đơn vị phụ trách",
              ],
              [
                user.role === "VT05" ? "/statistics" : "/reopens",
                user.role === "VT05" ? FileCheck2 : MessageSquare,
                user.role === "VT05"
                  ? "Báo cáo thống kê"
                  : "Yêu cầu xem xét lại",
                user.role === "VT05"
                  ? "Theo dõi hiệu quả giải quyết"
                  : "Xử lý phản hồi của người dân",
              ],
            ];
  return (
    <>
      <PageHeading
        eyebrow={roleLabels[user.role]?.toUpperCase()}
        title={`Xin chào, ${user.name.split(" ").slice(-2).join(" ")}!`}
        description={
          isCitizen
            ? "Cảm ơn bạn đã chung tay xây dựng một thành phố đáng sống."
            : "Tổng quan công việc và những cập nhật mới nhất dành cho bạn."
        }
        actions={
          <span className="today-label">
            <CalendarDays size={17} />
            {dateLabel(new Date())}
          </span>
        }
      />
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow light">CÙNG NHAU TẠO NÊN THAY ĐỔI</span>
          <h2>
            {isCitizen
              ? "Một tiếng nói. Nhiều thay đổi."
              : "Đúng người. Đúng việc. Kịp thời."}
          </h2>
          <p>
            {isCitizen
              ? "Theo dõi từng bước xử lý và chia sẻ đánh giá để thành phố ngày một tốt hơn."
              : "Mỗi công việc hoàn thành là một không gian sống tốt hơn cho cộng đồng."}
          </p>
          <Link className="btn btn-lime" to={shortcuts[0][0]}>
            {shortcuts[0][2]}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="welcome-art">
          <MapPin size={90} strokeWidth={0.8} />
          <span>
            <Check size={22} />
          </span>
        </div>
      </div>
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="stats-overview">
          {[
            [ClipboardList, "Tổng phản ánh", "total", "teal"],
            [Timer, "Chờ tiếp nhận", "submitted", "amber"],
            [Send, "Đang xử lý", "inProgress", "blue"],
            [CheckCircle2, "Đã hoàn thành", "closed", "green"],
          ].map(([Icon, label, key, tone]) => (
            <div className="stat-card" key={key}>
              <div className={`stat-card-icon ${tone}`}>
                <Icon size={22} />
              </div>
              <span>{label}</span>
              <strong>
                {stats.loading ? "—" : numberLabel(stats.data?.[key])}
              </strong>
            </div>
          ))}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel dashboard-main">
          <div className="recent-header">
            <div>
              <h2>Phản ánh gần đây</h2>
              <p>Những cập nhật mới nhất trong phạm vi của bạn</p>
            </div>
            <Link
              className="text-link"
              to={isCitizen ? "/my-reports" : "/reports"}
            >
              Xem tất cả
              <ArrowRight size={16} />
            </Link>
          </div>
          {reports.loading ? (
            <LoadingState />
          ) : reports.error ? (
            <ErrorState error={reports.error} onRetry={reports.reload} />
          ) : !reports.data?.items?.length ? (
            <EmptyState
              title="Chưa có phản ánh"
              description={
                isCitizen
                  ? "Phản ánh đầu tiên của bạn sẽ xuất hiện ở đây."
                  : "Các phản ánh mới sẽ xuất hiện trong danh sách này."
              }
            />
          ) : (
            <div className="recent-list">
              {reports.data.items.map((report) => (
                <Link
                  key={report.id}
                  className="recent-report"
                  to={`/reports/${report.id}`}
                >
                  <span className="recent-report-icon">
                    <MapPin size={20} />
                  </span>
                  <div>
                    <strong>{report.title}</strong>
                    <small>
                      {report.categoryName} · {dateLabel(report.createdAt)}
                    </small>
                  </div>
                  <StatusBadge status={report.status} />
                  <ChevronRight size={17} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="dashboard-side">
          <div className="panel">
            <h2>Thao tác nhanh</h2>
            <div className="quick-links">
              {shortcuts.map(([href, Icon, title, description]) => (
                <Link className="quick-link" key={href} to={href}>
                  <span>
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </div>
                  <ChevronRight size={17} />
                </Link>
              ))}
            </div>
          </div>
          <div className="trust-card">
            <ShieldCheck size={25} />
            <h3>An tâm khi kết nối</h3>
            <p>
              Thông tin liên hệ và vị trí chính xác của bạn chỉ được chia sẻ với
              cán bộ có trách nhiệm xử lý.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

export function NewReportPage() {
  const { meta, refreshMeta } = useMeta(),
    toast = useToast(),
    fileInput = useRef();
  const [form, setForm] = useState({
      title: "",
      description: "",
      categoryId: "",
      address: "",
      latitude: "",
      longitude: "",
      priority: "NORMAL",
    }),
    [files, setFiles] = useState([]),
    [uploaded, setUploaded] = useState([]),
    [duplicates, setDuplicates] = useState([]),
    [checked, setChecked] = useState(false),
    [confirmDuplicate, setConfirmDuplicate] = useState(false),
    [busy, setBusy] = useState(false),
    [checking, setChecking] = useState(false),
    [locating, setLocating] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(null);
  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((item) => URL.revokeObjectURL(item.url)),
    [previews],
  );
  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (["categoryId", "latitude", "longitude", "address"].includes(key)) {
      setChecked(false);
      setDuplicates([]);
      setConfirmDuplicate(false);
    }
  };
  const point =
    form.latitude !== "" &&
    form.longitude !== "" &&
    Number.isFinite(Number(form.latitude)) &&
    Number.isFinite(Number(form.longitude)) &&
    Math.abs(Number(form.latitude)) <= 90 &&
    Math.abs(Number(form.longitude)) <= 180
      ? [Number(form.latitude), Number(form.longitude)]
      : null;
  const selectPoint = ([latitude, longitude]) => {
    setForm((current) => ({ ...current, latitude, longitude }));
    setChecked(false);
    setDuplicates([]);
    setConfirmDuplicate(false);
  };
  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 5) {
      setError("Vui lòng chọn tối đa 5 ảnh.");
      return;
    }
    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Chỉ nhận ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.");
      return;
    }
    setFiles(selected);
    setUploaded([]);
    setError("");
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setError(
        "Trình duyệt không hỗ trợ định vị. Bạn có thể chọn điểm trên bản đồ.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPoint([
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        ]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(
          "Không thể lấy vị trí. Hãy cho phép truy cập vị trí hoặc chọn trên bản đồ.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const check = async () => {
    if (!form.categoryId || !point || !form.address.trim()) {
      setError(
        "Hãy chọn lĩnh vực, nhập địa điểm và chọn vị trí trước khi kiểm tra trùng.",
      );
      return;
    }
    setChecking(true);
    setError("");
    try {
      const result = await api("/reports/check-duplicates", {
        method: "POST",
        body: {
          categoryId: form.categoryId,
          address: form.address,
          latitude: point[0],
          longitude: point[1],
        },
      });
      setDuplicates(result.items || []);
      setChecked(true);
      setConfirmDuplicate(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setChecking(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!files.length) {
      setError("Vui lòng bổ sung ít nhất một ảnh sự cố.");
      return;
    }
    if (!point || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) {
      setError("Vui lòng chọn vị trí hợp lệ trên bản đồ.");
      return;
    }
    if (duplicates.length && !confirmDuplicate) {
      setError(
        "Hãy xem các phản ánh tương tự và xác nhận nếu đây là sự cố khác.",
      );
      return;
    }
    setBusy(true);
    try {
      let images = uploaded;
      if (!images.length) {
        images = await uploadFiles(files);
        setUploaded(images);
      }
      const result = await api("/reports", {
        method: "POST",
        body: {
          ...form,
          latitude: point[0],
          longitude: point[1],
          images,
          confirmDuplicate,
        },
      });
      setSuccess(result.report);
      toast("Phản ánh của bạn đã được gửi thành công.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error.status === 409 && error.data?.duplicates) {
        setDuplicates(error.data.duplicates);
        setChecked(true);
        setConfirmDuplicate(false);
      }
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (success)
    return (
      <div className="panel success-screen">
        <span className="success-icon">
          <CheckCircle2 size={48} />
        </span>
        <span className="eyebrow">CẢM ƠN BẠN ĐÃ LÊN TIẾNG</span>
        <h1>Phản ánh đã được gửi!</h1>
        <p>
          Chúng tôi đã ghi nhận phản ánh <strong>#{success.id}</strong>.<br />
          Bạn sẽ nhận được thông báo khi có cập nhật mới.
        </p>
        <StatusBadge status={success.status || "SUBMITTED"} />
        <div className="form-actions">
          <Link className="btn btn-primary" to={`/reports/${success.id}`}>
            Theo dõi phản ánh
            <ArrowRight size={18} />
          </Link>
          <Link className="btn btn-secondary" to="/my-reports">
            Phản ánh của tôi
          </Link>
        </div>
      </div>
    );
  return (
    <>
      <PageHeading
        eyebrow="LẮNG NGHE ĐỂ THAY ĐỔI"
        title="Gửi phản ánh mới"
        description="Chia sẻ vấn đề bạn gặp. Cùng chúng tôi xây dựng một thành phố tốt hơn."
      />
      <form onSubmit={submit} className="create-grid">
        <main className="create-main">
          <section className="panel form-section">
            <div className="section-title">
              <span className="section-number">01</span>
              <div>
                <h2>Thông tin phản ánh</h2>
                <p>Mô tả rõ vấn đề để được tiếp nhận nhanh chóng.</p>
              </div>
            </div>
            <div className="stack">
              <Field label="Tiêu đề phản ánh" required>
                <input
                  className="input"
                  placeholder="Ví dụ: Đèn đường không hoạt động trên đường Nguyễn Huệ"
                  value={form.title}
                  onChange={(event) => setValue("title", event.target.value)}
                  required
                  minLength={6}
                  maxLength={200}
                />
              </Field>
              <div className="form-grid">
                <Field label="Lĩnh vực phản ánh" required>
                  <select
                    className="select"
                    value={form.categoryId}
                    onChange={(event) =>
                      setValue("categoryId", event.target.value)
                    }
                    required
                  >
                    <option value="">Chọn lĩnh vực</option>
                    {meta.categories
                      .filter((item) => item.active !== false)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Mức độ ưu tiên">
                  <select
                    className="select"
                    value={form.priority}
                    onChange={(event) =>
                      setValue("priority", event.target.value)
                    }
                  >
                    <option value="NORMAL">Bình thường</option>
                    <option value="LOW">Thấp</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </Field>
              </div>
              {!meta.categories.length && (
                <InlineAlert>
                  Chưa tải được danh mục.{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={refreshMeta}
                  >
                    Tải lại danh mục
                  </button>
                </InlineAlert>
              )}
              <Field
                label="Nội dung mô tả"
                required
                hint={`${form.description.length}/5000 ký tự`}
              >
                <textarea
                  className="textarea"
                  rows={5}
                  placeholder="Vấn đề xảy ra khi nào? Tình trạng hiện tại và ảnh hưởng đến người dân như thế nào?"
                  value={form.description}
                  onChange={(event) =>
                    setValue("description", event.target.value)
                  }
                  required
                  minLength={10}
                  maxLength={5000}
                />
              </Field>
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-title">
              <span className="section-number">02</span>
              <div>
                <h2>Hình ảnh hiện trường</h2>
                <p>Ít nhất một ảnh giúp xác minh tình trạng thực tế.</p>
              </div>
            </div>
            <label className="upload-zone">
              <UploadCloud size={33} strokeWidth={1.5} />
              <strong>Chọn ảnh hoặc kéo thả vào đây</strong>
              <span>JPG, PNG, WebP · Tối đa 5 ảnh · 5 MB/ảnh</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={chooseFiles}
                aria-label="Ảnh sự cố"
              />
            </label>
            {previews.length > 0 && (
              <div className="upload-previews">
                {previews.map((item, index) => (
                  <div className="upload-preview" key={item.url}>
                    <img src={item.url} alt={`Ảnh sự cố ${index + 1}`} />
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Xóa ${item.name}`}
                      onClick={() => {
                        setFiles(files.filter((_, i) => i !== index));
                        setUploaded([]);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                    >
                      <X size={14} />
                    </button>
                    <small>{item.name}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="panel form-section">
            <div className="section-title">
              <span className="section-number">03</span>
              <div>
                <h2>Vị trí xảy ra sự cố</h2>
                <p>
                  Chọn đúng điểm cần xử lý, không cần vị trí nhà riêng của bạn.
                </p>
              </div>
            </div>
            <div className="stack">
              <Field label="Địa chỉ / địa điểm" required>
                <input
                  className="input"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện…"
                  value={form.address}
                  onChange={(event) => setValue("address", event.target.value)}
                  required
                  maxLength={255}
                />
              </Field>
              <div className="location-tools">
                <span>
                  <MapPin size={15} />
                  {point ? "Đã chọn vị trí sự cố" : "Chưa chọn vị trí"}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={locate}
                  disabled={locating}
                >
                  <LocateFixed size={16} />
                  {locating ? "Đang định vị…" : "Vị trí hiện tại"}
                </button>
              </div>
              <LocationMap
                selected={point}
                onSelect={selectPoint}
                height={340}
              />
              <div className="form-grid coordinates-grid">
                <Field label="Vĩ độ">
                  <input
                    className="input"
                    aria-label="Vĩ độ"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={form.latitude}
                    onChange={(event) =>
                      setValue("latitude", event.target.value)
                    }
                    placeholder="10.776900"
                    required
                  />
                </Field>
                <Field label="Kinh độ">
                  <input
                    className="input"
                    aria-label="Kinh độ"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={form.longitude}
                    onChange={(event) =>
                      setValue("longitude", event.target.value)
                    }
                    placeholder="106.700900"
                    required
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-title">
              <span className="section-number">04</span>
              <div>
                <h2>Kiểm tra & gửi phản ánh</h2>
                <p>Tránh trùng lặp để vấn đề được xử lý hiệu quả hơn.</p>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={checking || busy}
              onClick={check}
            >
              <Search size={17} />
              {checking ? "Đang kiểm tra…" : "Kiểm tra phản ánh tương tự"}
            </button>
            {checked && !duplicates.length && (
              <InlineAlert type="success">
                Không phát hiện phản ánh cùng loại trong bán kính 200 m trong 30
                ngày gần đây.
              </InlineAlert>
            )}
            {duplicates.length > 0 && (
              <div className="duplicate-list">
                <InlineAlert>
                  Phát hiện {duplicates.length} phản ánh có thể trùng. Hãy xem
                  trước khi tiếp tục gửi.
                </InlineAlert>
                {duplicates.map((item) => (
                  <div className="duplicate-item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.address}
                        {item.distanceMeters !== undefined && (
                          <>
                            {" "}
                            · Cách khoảng {Math.round(item.distanceMeters)} m
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={confirmDuplicate}
                    onChange={(event) =>
                      setConfirmDuplicate(event.target.checked)
                    }
                  />
                  <span>
                    Tôi đã kiểm tra và xác nhận đây là một sự cố khác, vẫn cần
                    gửi phản ánh mới.
                  </span>
                </label>
              </div>
            )}
            {error && <InlineAlert type="error">{error}</InlineAlert>}
            <div className="form-actions">
              <Link className="btn btn-secondary" to="/my-reports">
                Hủy
              </Link>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={busy || checking}
              >
                <Send size={17} />
                {busy ? "Đang gửi phản ánh…" : "Gửi phản ánh"}
              </button>
            </div>
          </section>
        </main>
        <aside className="create-side">
          <div className="panel guidance-panel">
            <span className="guidance-icon">
              <MessageSquare size={27} />
            </span>
            <h3>Phản ánh đúng, xử lý nhanh</h3>
            <ul className="guidance-list">
              <li>
                <CheckCircle2 size={17} />
                <span>Mô tả đúng thực trạng, rõ thời gian và ảnh hưởng.</span>
              </li>
              <li>
                <CheckCircle2 size={17} />
                <span>Ảnh rõ nét, thể hiện đầy đủ hiện trường.</span>
              </li>
              <li>
                <CheckCircle2 size={17} />
                <span>Chọn vị trí sự cố chính xác trên bản đồ.</span>
              </li>
              <li>
                <CheckCircle2 size={17} />
                <span>Kiểm tra các phản ánh tương tự trước khi gửi.</span>
              </li>
            </ul>
          </div>
          <div className="trust-card">
            <ShieldCheck size={26} />
            <h3>Quyền riêng tư được ưu tiên</h3>
            <p>
              Thông tin liên hệ và tọa độ chính xác không công khai. Chỉ người
              có trách nhiệm mới được truy cập để xử lý.
            </p>
          </div>
          <div className="create-support">
            <strong>Sau khi gửi phản ánh?</strong>
            <p>
              Theo dõi trong “Phản ánh của tôi”. Mọi thay đổi sẽ được cập nhật
              qua thông báo trong tài khoản.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
