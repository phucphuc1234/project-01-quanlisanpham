export const statusLabels = {
  SUBMITTED: "Chờ tiếp nhận",
  VERIFIED: "Đã xác minh",
  REJECTED: "Từ chối",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang xử lý",
  WAITING_ACCEPTANCE: "Chờ nghiệm thu",
  CLOSED: "Đã hoàn thành",
  REOPENED: "Mở lại",
};
export const priorityLabels = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};
export const roleLabels = {
  VT01: "Người dân",
  VT02: "Cán bộ tiếp nhận",
  VT03: "Đơn vị xử lý",
  VT04: "Cán bộ nghiệm thu",
  VT05: "Quản trị viên",
};
export function dateLabel(value, withTime = false) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(date);
}
export const numberLabel = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0));
export function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((value) => value[0])
      .join("")
      .toUpperCase() || "ND"
  );
}
export function categoryTone(name = "") {
  if (/giao thông/i.test(name)) return "amber";
  if (/chiếu sáng/i.test(name)) return "violet";
  if (/nước/i.test(name)) return "blue";
  if (/môi trường/i.test(name)) return "green";
  return "teal";
}
