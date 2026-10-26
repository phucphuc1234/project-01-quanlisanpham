import { useEffect } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import { statusLabels } from "../lib/utils";
export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu",
  description = "Các thông tin mới sẽ xuất hiện ở đây.",
  actions,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {actions}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>Đang tải dữ liệu…</span>
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={24} />
      <div>
        <strong>Không thể tải thông tin</strong>
        <p>
          {error?.message ||
            String(error || "Vui lòng kiểm tra kết nối và thử lại.")}
        </p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {statusLabels[status] || status}
    </span>
  );
}
export function Field({ label, children, hint, required }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <b className="required"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const previous = document.activeElement;
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function InlineAlert({ children, type = "info" }) {
  return (
    <div className={`inline-alert ${type}`}>
      {type === "success" ? (
        <CheckCircle2 size={19} />
      ) : (
        <AlertCircle size={19} />
      )}
      <div>{children}</div>
    </div>
  );
}
export function SectionLink({ children, ...props }) {
  return (
    <a {...props}>
      {children}
      <ArrowRight size={17} />
    </a>
  );
}
