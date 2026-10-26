import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Droplets,
  Leaf,
  Lightbulb,
  MapPin,
  Route,
  Shapes,
} from "lucide-react";
import { StatusBadge } from "./ui";
import { categoryTone, dateLabel } from "../lib/utils";
export const categoryIcons = {
  amber: Route,
  violet: Lightbulb,
  blue: Droplets,
  green: Leaf,
  teal: Shapes,
};
export default function ReportCard({ report, compact = false }) {
  const tone = categoryTone(report.categoryName),
    Icon = categoryIcons[tone];
  return (
    <Link
      to={`/reports/${report.id}`}
      className={`report-card ${compact ? "compact" : ""}`}
    >
      {!compact && (
        <div className={`report-cover cover-${tone}`}>
          {report.thumbnail ? (
            <img src={report.thumbnail} alt={report.title} loading="lazy" />
          ) : (
            <>
              <div className="cover-pattern" />
              <Icon size={48} strokeWidth={1.3} />
            </>
          )}
          <span className="cover-category">
            <Icon size={13} />
            {report.categoryName || "Hạ tầng đô thị"}
          </span>
          <span className="cover-arrow">
            <ArrowUpRight size={18} />
          </span>
        </div>
      )}
      <div className="report-card-body">
        <div className="report-card-meta">
          <span className="report-code">#{report.id}</span>
          <StatusBadge status={report.status} />
        </div>
        <h3>{report.title}</h3>
        <p className="report-address">
          <MapPin size={14} />
          <span>{report.address}</span>
        </p>
        <div className="report-card-bottom">
          <span>
            <CalendarDays size={13} />
            {dateLabel(report.createdAt)}
          </span>
          <span>
            {report.unitName || report.categoryName || "Phản ánh cộng đồng"}
          </span>
        </div>
      </div>
    </Link>
  );
}
