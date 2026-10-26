import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Flag,
  ImagePlus,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { api, uploadFiles } from "../lib/api";
import { useApiData, useAuth, useMeta, useToast } from "../lib/context";
import { dateLabel, priorityLabels, statusLabels } from "../lib/utils";
import {
  ErrorState,
  Field,
  InlineAlert,
  LoadingState,
  Modal,
  PageHeading,
  StatusBadge,
} from "../components/ui";
import LocationMap from "../components/LocationMap";
const actionLabels = {
  verify: "Xác minh & tiếp nhận",
  reject: "Từ chối phản ánh",
  assign: "Phân công đơn vị xử lý",
  "accept-task": "Tiếp nhận nhiệm vụ",
  "return-task": "Yêu cầu trả nhiệm vụ",
  progress: "Cập nhật tiến độ",
  "submit-result": "Gửi kết quả nghiệm thu",
  "accept-result": "Chấp nhận nghiệm thu",
  rework: "Yêu cầu xử lý lại",
};
function availableActions(user, report) {
  if (!user) return [];
  const admin = user.role === "VT05",
    intake = admin || user.role === "VT02",
    unit = admin || (user.role === "VT03" && user.unitId === report.unitId),
    inspector = admin || user.role === "VT04";
  if (report.status === "SUBMITTED" && intake) return ["verify", "reject"];
  if (["VERIFIED", "REOPENED"].includes(report.status) && intake)
    return ["assign"];
  if (report.status === "ASSIGNED" && unit)
    return ["accept-task", "return-task"];
  if (report.status === "IN_PROGRESS" && unit)
    return ["progress", "submit-result"];
  if (report.status === "WAITING_ACCEPTANCE" && inspector)
    return ["accept-result", "rework"];
  return [];
}
function StaffDuplicateCheck({ report }) {
  const [checking, setChecking] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const check = async () => {
    setChecking(true);
    setError("");
    try {
      const result = await api("/reports/check-duplicates", {
        method: "POST",
        body: {
          categoryId: report.categoryId,
          address: report.address,
          latitude: Number(report.latitude),
          longitude: Number(report.longitude),
        },
      });
      setItems((result.items || []).filter((item) => item.id !== report.id));
    } catch (error) {
      setError(error.message);
    } finally {
      setChecking(false);
    }
  };
  return (
    <section className="panel">
      <div className="detail-section-heading">
        <h2>Đối chiếu phản ánh tương tự</h2>
        <Search size={19} />
      </div>
      <p className="muted">Kiểm tra các phản ánh cùng lĩnh vực trong bán kính 200 m, gửi trong 30 ngày gần đây trước khi xác minh hoặc phân công.</p>
      <button className="btn btn-secondary" onClick={check} disabled={checking}>
        <Search size={16} />{checking ? "Đang kiểm tra…" : "Kiểm tra trùng"}
      </button>
      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {items?.length === 0 && <InlineAlert type="success">Không phát hiện phản ánh khác có khả năng trùng.</InlineAlert>}
      {items?.length > 0 && <div className="duplicate-list">
        <InlineAlert>Có {items.length} phản ánh tương tự. Hãy đối chiếu trước khi tiếp tục xử lý.</InlineAlert>
        {items.map(item => <Link className="duplicate-item" key={item.id} to={`/reports/${item.id}`}>
          <div><strong>{item.title}</strong><p>{item.address}{Number.isFinite(item.distanceMeters) ? ` · Khoảng ${Math.round(item.distanceMeters)} m` : ""}</p></div>
          <StatusBadge status={item.status} />
        </Link>)}
      </div>}
    </section>
  );
}
function ActionForm({ action, report, onClose, onSaved }) {
  const { meta } = useMeta(),
    toast = useToast();
  const localDate = new Date(Date.now() + 86400000);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  const [form, setForm] = useState({
      note: "",
      categoryId: report.categoryId,
      priority: report.priority || "NORMAL",
      unitId: "",
      dueAt: localDate.toISOString().slice(0, 16),
    }),
    [files, setFiles] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const field = (key) => ({
    value: form[key],
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
  });
  const noteRequired = [
      "reject",
      "return-task",
      "progress",
      "submit-result",
      "rework",
    ].includes(action),
    withImages = ["progress", "submit-result"].includes(action);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (action === "submit-result" && !files.length)
        throw new Error("Vui lòng tải ít nhất một ảnh sau xử lý.");
      if (
        files.length > 5 ||
        files.some(
          (file) =>
            file.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type),
        )
      )
        throw new Error(
          "Chỉ nhận tối đa 5 ảnh JPG, PNG, WebP và 5 MB mỗi ảnh.",
        );
      const images = await uploadFiles(files);
      await api(`/reports/${report.id}/actions`, {
        method: "POST",
        body: {
          action,
          ...form,
          dueAt:
            action === "assign"
              ? new Date(form.dueAt).toISOString()
              : undefined,
          images,
        },
      });
      toast("Đã cập nhật phản ánh thành công.");
      onSaved();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={actionLabels[action]} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="action-report-summary">
          <span>#{report.id}</span>
          <strong>{report.title}</strong>
          <StatusBadge status={report.status} />
        </div>
        {action === "verify" && (
          <div className="form-grid">
            <Field label="Phân loại phản ánh" required>
              <select className="select" required {...field("categoryId")}>
                {meta.categories
                  .filter((item) => item.active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Mức độ ưu tiên">
              <select className="select" {...field("priority")}>
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {action === "assign" && (
          <>
            <Field label="Đơn vị xử lý" required>
              <select className="select" required {...field("unitId")}>
                <option value="">Chọn đơn vị phụ trách</option>
                {meta.units
                  .filter((item) => item.active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Thời hạn xử lý" required>
              <input
                className="input"
                type="datetime-local"
                required
                {...field("dueAt")}
              />
            </Field>
          </>
        )}
        {action === "accept-task" && (
          <InlineAlert>
            Bạn xác nhận đơn vị sẽ tiếp nhận và bắt đầu xử lý nhiệm vụ này?
          </InlineAlert>
        )}
        {action === "accept-result" && (
          <InlineAlert type="success">
            Khi xác nhận, kết quả sẽ được đóng và thông báo đến người dân để
            đánh giá.
          </InlineAlert>
        )}
        <Field
          label={
            action === "submit-result"
              ? "Mô tả kết quả xử lý"
              : action === "progress"
                ? "Nội dung cập nhật tiến độ"
                : ["reject", "rework", "return-task"].includes(action)
                  ? "Lý do"
                  : "Ghi chú / nhận xét"
          }
          required={noteRequired}
        >
          <textarea
            className="textarea"
            rows={4}
            maxLength={1000}
            placeholder={
              noteRequired
                ? "Nhập đầy đủ nội dung để các bên cùng theo dõi…"
                : "Nhập nhận xét nếu có…"
            }
            required={noteRequired}
            minLength={noteRequired ? 3 : undefined}
            {...field("note")}
          />
        </Field>
        {withImages && (
          <Field
            label={
              action === "submit-result" ? "Ảnh sau xử lý" : "Ảnh minh chứng"
            }
            required={action === "submit-result"}
            hint="JPG, PNG, WebP · Tối đa 5 MB/ảnh"
          >
            <input
              className="input file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required={action === "submit-result"}
              onChange={(event) =>
                setFiles(Array.from(event.target.files || []))
              }
            />
          </Field>
        )}
        {error && <InlineAlert type="error">{error}</InlineAlert>}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className={`btn ${["reject", "rework", "return-task"].includes(action) ? "btn-danger" : "btn-primary"}`}
            disabled={busy}
          >
            {busy ? "Đang lưu…" : "Xác nhận"}
            <Check size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams(),
    { user } = useAuth(),
    toast = useToast(),
    resource = useApiData(`/reports/${encodeURIComponent(id)}`);
  const [action, setAction] = useState(null),
    [rating, setRating] = useState(0),
    [comment, setComment] = useState(""),
    [feedbackBusy, setFeedbackBusy] = useState(false),
    [feedbackError, setFeedbackError] = useState(""),
    [reopen, setReopen] = useState(false),
    [reason, setReason] = useState(""),
    [reopenDescription, setReopenDescription] = useState(""),
    [reopenBusy, setReopenBusy] = useState(false),
    [reopenError, setReopenError] = useState(""),
    [lightbox, setLightbox] = useState(null);
  useEffect(() => {
    setAction(null);
    setRating(0);
    setComment("");
    setFeedbackError("");
    setReopen(false);
    setReason("");
    setReopenDescription("");
    setReopenError("");
    setLightbox(null);
  }, [id]);
  if (resource.loading) return <LoadingState />;
  if (resource.error)
    return (
      <>
        <Link className="back-link" to="/reports">
          <ArrowLeft size={17} />
          Danh sách phản ánh
        </Link>
        <ErrorState error={resource.error} onRetry={resource.reload} />
      </>
    );
  const report = resource.data.report || resource.data,
    actions = availableActions(user, report),
    isOwner = user && user.id === report.ownerId && user.role === "VT01";
  const history = report.history || [],
    feedback = report.feedback || [],
    latestClosed = Math.max(
      0,
      ...history
        .filter((item) => item.toStatus === "CLOSED")
        .map((item) => new Date(item.createdAt).getTime()),
    );
  const cycleFeedback = feedback.filter(
      (item) =>
        !latestClosed || new Date(item.createdAt).getTime() >= latestClosed,
    ),
    canFeedback =
      isOwner && report.status === "CLOSED" && !cycleFeedback.length,
    canReopen =
      isOwner &&
      report.status === "CLOSED" &&
      cycleFeedback.some((item) => Number(item.rating) <= 2) &&
      !(report.reopens || []).some((item) => item.status === "PENDING");
  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!rating) {
      setFeedbackError("Vui lòng chọn mức độ hài lòng từ 1 đến 5 sao.");
      return;
    }
    setFeedbackBusy(true);
    setFeedbackError("");
    try {
      await api(`/reports/${id}/feedback`, {
        method: "POST",
        body: { rating, comment },
      });
      toast("Cảm ơn đánh giá của bạn!");
      resource.reload();
    } catch (error) {
      setFeedbackError(error.message);
    } finally {
      setFeedbackBusy(false);
    }
  };
  const submitReopen = async (event) => {
    event.preventDefault();
    setReopenBusy(true);
    setReopenError("");
    try {
      await api(`/reports/${id}/reopen`, {
        method: "POST",
        body: { reason, description: reopenDescription },
      });
      toast("Đã gửi yêu cầu xem xét lại đến cán bộ phụ trách.");
      setReopen(false);
      resource.reload();
    } catch (error) {
      setReopenError(error.message);
    } finally {
      setReopenBusy(false);
    }
  };
  const hasLocation =
    report.latitude !== null &&
    report.latitude !== undefined &&
    report.longitude !== null &&
    report.longitude !== undefined;
  const photos = report.images || [];
  return (
    <>
      <Link className="back-link" to={isOwner ? "/my-reports" : "/reports"}>
        <ArrowLeft size={17} />
        Quay lại danh sách
      </Link>
      <PageHeading
        eyebrow={`PHẢN ÁNH #${report.id}`}
        title={report.title}
        description={
          <>
            <MapPin size={15} />
            {report.address}
          </>
        }
        actions={<StatusBadge status={report.status} />}
      />
      <div className="detail-grid">
        <main className="detail-main">
          <section className="panel">
            <div className="detail-section-heading">
              <h2>Nội dung phản ánh</h2>
              <span className={`priority-badge priority-${report.priority}`}>
                <Flag size={13} />
                {priorityLabels[report.priority] || "Bình thường"}
              </span>
            </div>
            <p className="detail-description">{report.description}</p>
            {photos.length > 0 && (
              <div className="detail-photo-grid">
                {photos.map((photo, index) => (
                  <button
                    className="detail-photo"
                    key={photo.id || photo.url}
                    onClick={() => setLightbox(photo.url)}
                  >
                    <img
                      src={photo.url}
                      alt={`${photo.type === "SAU_XU_LY" ? "Sau xử lý" : "Ảnh sự cố"} ${index + 1}`}
                      loading="lazy"
                    />
                    <span>
                      {photo.type === "SAU_XU_LY"
                        ? "Sau xử lý"
                        : photo.type === "TRUOC_XU_LY"
                          ? "Trước xử lý"
                          : "Ảnh hiện trường"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {report.status === "REJECTED" && (
              <InlineAlert type="error">
                <strong>Lý do từ chối:</strong>{" "}
                {report.rejectionReason ||
                  history.find((item) => item.toStatus === "REJECTED")?.note ||
                  "Vui lòng liên hệ cán bộ tiếp nhận để biết thêm thông tin."}
              </InlineAlert>
            )}
          </section>
          {user && ["VT02", "VT05"].includes(user.role) && ["SUBMITTED", "VERIFIED", "REOPENED"].includes(report.status) && <StaffDuplicateCheck key={report.id} report={report} />}
          {hasLocation && (
            <section className="panel">
              <h2>Vị trí sự cố</h2>
              <p className="muted">
                <MapPin size={15} />
                {report.address}
              </p>
              <LocationMap
                selected={[Number(report.latitude), Number(report.longitude)]}
                height={300}
              />
            </section>
          )}
          {report.progress?.length > 0 && (
            <section className="panel">
              <h2>Tiến độ xử lý</h2>
              <div className="stack">
                {report.progress.map((item) => (
                  <div className="progress-entry" key={item.id}>
                    <div className="entry-heading">
                      <strong>{item.actorName || "Đơn vị xử lý"}</strong>
                      <time>{dateLabel(item.createdAt, true)}</time>
                    </div>
                    <p className="detail-description">{item.note}</p>
                    {item.imageUrl && (
                      <button
                        className="evidence-photo"
                        onClick={() => setLightbox(item.imageUrl)}
                      >
                        <img
                          src={item.imageUrl}
                          alt="Minh chứng cập nhật tiến độ"
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {report.results?.length > 0 && (
            <section className="panel">
              <div className="detail-section-heading">
                <h2>Kết quả xử lý</h2>
                <FileCheck2 size={21} />
              </div>
              <div className="stack">
                {report.results.map((item) => (
                  <article className="result-card" key={item.id}>
                    <div className="entry-heading">
                      <span
                        className={`badge ${item.status === "ACCEPTED" ? "badge-success" : item.status === "REJECTED" ? "badge-danger" : ""}`}
                      >
                        {item.status === "ACCEPTED"
                          ? "Đã nghiệm thu"
                          : item.status === "REJECTED"
                            ? "Cần xử lý lại"
                            : "Chờ nghiệm thu"}
                      </span>
                      <time>{dateLabel(item.createdAt, true)}</time>
                    </div>
                    <p className="detail-description">{item.note}</p>
                    {item.imageUrl && (
                      <button
                        className="evidence-photo"
                        onClick={() => setLightbox(item.imageUrl)}
                      >
                        <img src={item.imageUrl} alt="Ảnh kết quả sau xử lý" />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {(canFeedback || feedback.length > 0) && (
            <section className="panel">
              <h2>Đánh giá kết quả</h2>
              {feedback.map((item) => (
                <div className="feedback-entry" key={item.id}>
                  <div className="entry-heading">
                    <div
                      className="rating-stars"
                      aria-label={`${item.rating} trên 5 sao`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={star <= item.rating ? "currentColor" : "none"}
                          className={star <= item.rating ? "filled" : ""}
                        />
                      ))}
                    </div>
                    <time>{dateLabel(item.createdAt)}</time>
                  </div>
                  {item.comment && <p>{item.comment}</p>}
                </div>
              ))}
              {canFeedback && (
                <form className="stack" onSubmit={submitFeedback}>
                  <p className="muted">
                    Bạn có hài lòng với kết quả xử lý? Đánh giá của bạn giúp
                    chúng tôi phục vụ tốt hơn.
                  </p>
                  <div
                    className="feedback-stars"
                    role="group"
                    aria-label="Mức độ hài lòng"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`rating-button ${star <= rating ? "selected" : ""}`}
                        aria-label={`${star} sao`}
                        aria-pressed={star === rating}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          size={33}
                          fill={star <= rating ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span>
                        {
                          [
                            "",
                            "Rất chưa hài lòng",
                            "Chưa hài lòng",
                            "Bình thường",
                            "Hài lòng",
                            "Rất hài lòng",
                          ][rating]
                        }
                      </span>
                    )}
                  </div>
                  <Field label="Nhận xét của bạn">
                    <textarea
                      className="textarea"
                      rows={3}
                      maxLength={1000}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Chia sẻ thêm về kết quả xử lý…"
                    />
                  </Field>
                  {feedbackError && (
                    <InlineAlert type="error">{feedbackError}</InlineAlert>
                  )}
                  <div>
                    <button className="btn btn-primary" disabled={feedbackBusy}>
                      <Send size={16} />
                      {feedbackBusy ? "Đang gửi…" : "Gửi đánh giá"}
                    </button>
                  </div>
                </form>
              )}
              {canReopen && (
                <div className="reopen-callout">
                  <div>
                    <strong>Kết quả vẫn chưa thỏa đáng?</strong>
                    <p>Bạn có thể yêu cầu cán bộ xem xét lại phản ánh.</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setReopen(true)}
                  >
                    <RotateCcw size={16} />
                    Yêu cầu xem xét lại
                  </button>
                </div>
              )}
            </section>
          )}
          {report.reopens?.length > 0 && (
            <section className="panel">
              <h2>Yêu cầu xem xét lại</h2>
              {report.reopens.map((item) => (
                <div className="reopen-entry" key={item.id}>
                  <div className="entry-heading">
                    <span
                      className={`badge ${item.status === "APPROVED" ? "badge-success" : item.status === "REJECTED" ? "badge-danger" : ""}`}
                    >
                      {item.status === "PENDING"
                        ? "Đang chờ xem xét"
                        : item.status === "APPROVED"
                          ? "Đã chấp nhận mở lại"
                          : "Không chấp nhận"}
                    </span>
                    <time>{dateLabel(item.createdAt)}</time>
                  </div>
                  <h3>{item.reason}</h3>
                  {item.description && <p>{item.description}</p>}
                  {item.note && (
                    <InlineAlert>Ý kiến xử lý: {item.note}</InlineAlert>
                  )}
                </div>
              ))}
            </section>
          )}
        </main>
        <aside className="detail-side">
          {actions.length > 0 && (
            <section className="panel action-panel">
              <span className="eyebrow">THAO TÁC NGHIỆP VỤ</span>
              <h2>Tiếp tục xử lý</h2>
              <div className="action-stack">
                {actions.map((key, index) => (
                  <button
                    className={`btn ${["reject", "return-task", "rework"].includes(key) ? "btn-danger-outline" : index === 0 ? "btn-primary" : "btn-secondary"}`}
                    key={key}
                    onClick={() => setAction(key)}
                  >
                    {actionLabels[key]}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="panel">
            <h2>Thông tin theo dõi</h2>
            <div className="detail-info">
              <div className="detail-info-row">
                <CalendarDays size={17} />
                <div>
                  <small>Ngày gửi</small>
                  <strong>{dateLabel(report.createdAt, true)}</strong>
                </div>
              </div>
              <div className="detail-info-row">
                <Flag size={17} />
                <div>
                  <small>Lĩnh vực</small>
                  <strong>{report.categoryName}</strong>
                </div>
              </div>
              <div className="detail-info-row">
                <Building2 size={17} />
                <div>
                  <small>Đơn vị phụ trách</small>
                  <strong>{report.unitName || "Chưa phân công"}</strong>
                </div>
              </div>
              {report.dueAt && (
                <div className="detail-info-row">
                  <Clock3 size={17} />
                  <div>
                    <small>Hạn xử lý</small>
                    <strong
                      className={
                        new Date(report.dueAt) < new Date() &&
                        report.status !== "CLOSED"
                          ? "danger-text"
                          : ""
                      }
                    >
                      {dateLabel(report.dueAt, true)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <h2>Lịch sử xử lý</h2>
            {history.length ? (
              <ol className="timeline">
                {[...history]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((item, index) => (
                    <li className="timeline-item" key={item.id}>
                      <span
                        className={`timeline-dot ${index === 0 ? "current" : ""}`}
                      >
                        {index === 0 ? <Check size={11} /> : null}
                      </span>
                      <div className="timeline-content">
                        <strong>
                          {statusLabels[item.toStatus] || item.toStatus}
                        </strong>
                        <time>{dateLabel(item.createdAt, true)}</time>
                        {item.note && <p>{item.note}</p>}
                        {item.actorName && <small>{item.actorName}</small>}
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="muted">Chưa có lịch sử được công khai.</p>
            )}
          </section>
          <div className="trust-card">
            <ShieldCheck size={24} />
            <h3>Minh bạch trong từng bước</h3>
            <p>
              Mọi thay đổi trạng thái đều được ghi nhận. Thông tin cá nhân của
              người gửi được bảo vệ.
            </p>
          </div>
        </aside>
      </div>
      {action && (
        <ActionForm
          action={action}
          report={report}
          onClose={() => setAction(null)}
          onSaved={resource.reload}
        />
      )}{" "}
      {reopen && (
        <Modal title="Yêu cầu xem xét lại" onClose={() => setReopen(false)}>
          <form className="stack" onSubmit={submitReopen}>
            <InlineAlert>
              Hãy nêu rõ lý do kết quả chưa thỏa đáng để cán bộ có thể xem xét.
            </InlineAlert>
            <Field label="Lý do yêu cầu" required>
              <textarea
                className="textarea"
                rows={3}
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Tình trạng nào vẫn chưa được khắc phục?"
              />
            </Field>
            <Field label="Thông tin bổ sung">
              <textarea
                className="textarea"
                rows={4}
                maxLength={2000}
                value={reopenDescription}
                onChange={(event) => setReopenDescription(event.target.value)}
              />
            </Field>
            {reopenError && (
              <InlineAlert type="error">{reopenError}</InlineAlert>
            )}
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setReopen(false)}
              >
                Hủy
              </button>
              <button className="btn btn-primary" disabled={reopenBusy}>
                {reopenBusy ? "Đang gửi…" : "Gửi yêu cầu"}
                <Send size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {lightbox && (
        <Modal title="Ảnh minh chứng" onClose={() => setLightbox(null)} wide>
          <img
            className="lightbox-image"
            src={lightbox}
            alt="Ảnh minh chứng phóng to"
          />
        </Modal>
      )}
    </>
  );
}
