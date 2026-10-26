import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  MapPin,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";
import { useApiData } from "../lib/context";
import { EmptyState, ErrorState, LoadingState } from "../components/ui";
import { numberLabel } from "../lib/utils";
import ReportCard from "../components/ReportCard";
function CityIllustration() {
  return (
    <svg
      className="city-illustration"
      viewBox="0 0 600 460"
      role="img"
      aria-label="Minh họa thành phố xanh với đường sá, nhà cửa và cây xanh"
    >
      <defs>
        <pattern
          id="windows"
          width="22"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="12" x="7" y="5" fill="#fff" opacity=".65" />
        </pattern>
        <linearGradient id="building" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a7c9c6" />
          <stop offset="1" stopColor="#5b9898" />
        </linearGradient>
      </defs>
      <ellipse
        cx="306"
        cy="335"
        rx="257"
        ry="110"
        fill="#0b3e45"
        opacity=".35"
      />
      <path d="M50 290 278 173 559 300 328 429Z" fill="#d5e7d5" />
      <path d="m50 290 278 139v18L50 307Z" fill="#81a89b" />
      <path d="m328 429 231-129v18L328 447Z" fill="#527f79" />
      <path d="m105 318 225-119 61 29-227 119Z" fill="#738e8b" />
      <path d="m185 357 229-120 52 25-229 122Z" fill="#718b89" />
      <path
        d="m125 330 223-118M206 370l230-120"
        stroke="#e1e9d9"
        strokeWidth="3"
        strokeDasharray="15 13"
      />
      <path d="m78 277 271 133 34-19L115 256Z" fill="#84b69c" />
      <path d="M190 257V109l66-30v148Z" fill="#d3e7e0" />
      <path d="m256 79 52 27v147l-52-26Z" fill="#76a6a1" />
      <path d="m190 109 66-30 52 27-65 33Z" fill="#e5f0e6" />
      <path d="M197 116v130l52-25V91Z" fill="url(#windows)" />
      <path d="m265 116 34 17v105l-34-16Z" fill="url(#windows)" opacity=".7" />
      <path d="M349 284V127l71-35v155Z" fill="url(#building)" />
      <path d="m420 92 46 24v155l-46-24Z" fill="#4c8c8d" />
      <path d="m349 127 71-35 46 24-72 36Z" fill="#c3e1d6" />
      <path d="m359 133 51-25v130l-51 25Z" fill="url(#windows)" />
      <path d="m429 126 28 14v113l-28-14Z" fill="url(#windows)" opacity=".7" />
      <path d="M117 268v-73l43-22v73Z" fill="#e9c8a3" />
      <path d="m160 173 33 17v74l-33-18Z" fill="#b58f79" />
      <path d="m108 195 49-45 45 39-42-16-43 22Z" fill="#eb9974" />
      <path d="m124 205 26-14v48l-26 14Z" fill="url(#windows)" />
      <path d="M284 343v-78l44-23v78Z" fill="#e6dbc4" />
      <path d="m328 242 35 18v78l-35-18Z" fill="#b4b49b" />
      <path d="m275 265 49-43 48 38-44-18-44 23Z" fill="#477f78" />
      <path d="m291 275 27-14v50l-27 13Z" fill="url(#windows)" />
      {[
        [94, 274, 1],
        [165, 291, 0.8],
        [475, 295, 1.1],
        [405, 354, 1],
        [267, 383, 0.8],
        [513, 315, 0.8],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse rx="17" ry="8" cy="8" fill="#527c64" opacity=".2" />
          <path d="M0 0v-27" stroke="#bd9d73" strokeWidth="5" />
          <ellipse
            cy="-31"
            rx="17"
            ry="25"
            fill={i % 2 ? "#619d70" : "#89b976"}
          />
          <ellipse
            cx="-5"
            cy="-34"
            rx="10"
            ry="17"
            fill="#a4c98b"
            opacity=".55"
          />
        </g>
      ))}
      <path
        d="M220 300v-51l16-8"
        stroke="#e6dfbd"
        fill="none"
        strokeWidth="3"
      />
      <ellipse cx="236" cy="241" rx="7" ry="3" fill="#f6d590" />
      <path d="m295 349 21-11 18 9-22 12Z" fill="#f3bb69" />
      <path d="m299 348 10-11 12 6-7 10Z" fill="#c9e2da" />
      <circle cx="304" cy="355" r="3" fill="#314b4c" />
      <circle cx="325" cy="347" r="3" fill="#314b4c" />
      <path
        d="M72 159h38m-19-19v38M491 183h24m-12-12v24"
        stroke="#75a7a0"
        strokeWidth="2"
        opacity=".5"
      />
      <circle cx="336" cy="70" r="4" fill="#b9cc9c" />
      <circle cx="501" cy="104" r="6" fill="#517d7d" />
    </svg>
  );
}
export default function HomePage() {
  const stats = useApiData("/stats"),
    reports = useApiData("/reports?pageSize=3&status=CLOSED");
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="container hero-inner">
          <div className="hero-content">
            <span className="hero-kicker">
              <span /> KẾT NỐI NGƯỜI DÂN · KIẾN TẠO ĐÔ THỊ
            </span>
            <h1>
              Một phản ánh nhỏ.
              <br />
              Một thành phố
              <br />
              <em>tốt hơn.</em>
            </h1>
            <p>
              Đường hỏng, đèn tắt, rác thải hay ngập nước?
              <br />
              Hãy lên tiếng. Chúng tôi lắng nghe và cùng hành động.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-lime" to="/reports/new">
                <Plus size={20} />
                Gửi phản ánh ngay
                <ArrowUpRight size={18} />
              </Link>
              <Link className="hero-text-link" to="/reports">
                Khám phá phản ánh
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={16} />
              <span>Thông tin được bảo mật</span>
              <span className="separator-dot" />
              <span>Theo dõi tiến độ minh bạch</span>
            </div>
          </div>
          <div className="hero-visual">
            <CityIllustration />
            <div className="city-label">
              <span className="city-label-icon">
                <Check size={18} />
              </span>
              <span>
                Thay đổi bắt đầu từ bạn
                <strong>Vì một thành phố đáng sống</strong>
              </span>
              <Sprout size={24} />
            </div>
            <div className="city-caption">
              <span className="pulse-dot" /> THÀNH PHỐ HỒ CHÍ MINH
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="container">
            <span>Cùng chung tay cho không gian sống tốt đẹp hơn</span>
            <a href="#community">
              Khám phá nền tảng
              <ArrowDown size={14} />
            </a>
          </div>
        </div>
      </section>
      <section className="impact-strip" id="community">
        <div className="container impact-grid">
          <div className="impact-intro">
            <span className="eyebrow">MỖI TIẾNG NÓI ĐỀU CÓ GIÁ TRỊ</span>
            <h2>
              Kết nối tạo nên
              <br />
              những thay đổi.
            </h2>
          </div>
          <div className="impact-stat">
            <span className="stat-icon">
              <ClipboardCheck size={23} />
            </span>
            <div>
              <strong>
                {stats.data ? numberLabel(stats.data.closed) : "—"}
              </strong>
              <span>Phản ánh đã giải quyết</span>
            </div>
          </div>
          <div className="impact-stat">
            <span className="stat-icon">
              <TrendingUp size={23} />
            </span>
            <div>
              <strong>
                {stats.data
                  ? `${numberLabel(stats.data.averageDays)} ngày`
                  : "—"}
              </strong>
              <span>Thời gian xử lý trung bình</span>
            </div>
          </div>
          <div className="impact-stat">
            <span className="stat-icon">
              <MapPin size={23} />
            </span>
            <div>
              <strong>
                {stats.data
                  ? numberLabel(
                      stats.data.byCategory?.filter((item) => item.count > 0)
                        .length,
                    )
                  : "—"}
              </strong>
              <span>Lĩnh vực đã tiếp nhận</span>
            </div>
          </div>
        </div>
      </section>
      <section className="home-section container" id="how-it-works">
        <div className="section-heading">
          <div>
            <div className="eyebrow">TỪ PHẢN ÁNH ĐẾN HÀNH ĐỘNG</div>
            <h2>Cùng bạn, từ đầu đến cuối.</h2>
            <p>Một quy trình rõ ràng. Mỗi bước đều có thể theo dõi.</p>
          </div>
          <Link className="text-link" to="/reports/new">
            Bắt đầu ngay
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="steps-grid">
          {[
            [
              Send,
              "01",
              "Gửi phản ánh",
              "Chụp ảnh, mô tả sự cố và chọn vị trí trên bản đồ.",
            ],
            [
              MessageSquare,
              "02",
              "Tiếp nhận & xác minh",
              "Cán bộ kiểm tra, phân loại và chuyển đến đơn vị phụ trách.",
            ],
            [
              FileCheck2,
              "03",
              "Xử lý & nghiệm thu",
              "Theo dõi tiến độ và bằng chứng trước, sau xử lý.",
            ],
            [
              CheckCircle2,
              "04",
              "Đánh giá kết quả",
              "Gửi đánh giá hoặc yêu cầu xem xét lại nếu chưa hài lòng.",
            ],
          ].map(([Icon, n, title, description]) => (
            <div className="step-card" key={n}>
              <div className="step-top">
                <span>
                  <Icon size={24} strokeWidth={1.6} />
                </span>
                <b>{n}</b>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="community-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">KẾT QUẢ ĐƯỢC CỘNG ĐỒNG THEO DÕI</div>
              <h2>Những thay đổi quanh ta.</h2>
              <p>Phản ánh đã được xử lý, nghiệm thu và công khai kết quả.</p>
            </div>
            <Link className="btn btn-secondary" to="/reports">
              Xem tất cả
              <ArrowRight size={16} />
            </Link>
          </div>
          {reports.loading ? (
            <LoadingState />
          ) : reports.error ? (
            <ErrorState error={reports.error} onRetry={reports.reload} />
          ) : reports.data?.items?.length ? (
            <div className="reports-grid">
              {reports.data.items.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có kết quả được công bố"
              description="Các phản ánh hoàn thành sẽ được hiển thị tại đây để cộng đồng cùng theo dõi."
            />
          )}
          <div className="privacy-note">
            <ShieldCheck size={16} />
            Thông tin cá nhân và tọa độ chính xác của người gửi không được công
            khai.
          </div>
        </div>
      </section>
      <section className="home-cta container">
        <div className="cta-symbol">
          <Sprout size={54} strokeWidth={1.2} />
        </div>
        <div>
          <span className="eyebrow">
            THÀNH PHỐ TỐT HƠN, BẮT ĐẦU TỪ CHÚNG TA
          </span>
          <h2>Bạn thấy điều gì cần thay đổi?</h2>
          <p>Đừng chỉ đi qua. Hãy gửi phản ánh để cùng tạo nên sự khác biệt.</p>
        </div>
        <Link className="btn btn-primary" to="/reports/new">
          Gửi phản ánh
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
