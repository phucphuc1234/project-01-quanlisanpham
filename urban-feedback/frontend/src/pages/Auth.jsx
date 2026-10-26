import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { useAuth, useToast } from "../lib/context";
import { Field, InlineAlert } from "../components/ui";
export default function AuthPage({ registerMode = false }) {
  const { user, login, register } = useAuth(),
    toast = useToast(),
    navigate = useNavigate(),
    location = useLocation();
  const [values, setValues] = useState({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      address: "",
      identifier: "",
    }),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [agree, setAgree] = useState(false);
  if (user)
    return <Navigate to={location.state?.from || "/dashboard"} replace />;
  const field = (key) => ({
    value: values[key],
    onChange: (event) => setValues({ ...values, [key]: event.target.value }),
  });
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (registerMode && values.password !== values.confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      if (registerMode) {
        await register(values);
        toast(
          "Tạo tài khoản thành công. Chào mừng bạn đến với Đô thị Kết nối!",
        );
      } else {
        await login({
          identifier: values.identifier,
          password: values.password,
        });
        toast("Đăng nhập thành công.");
      }
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link to="/" className="brand brand-light">
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          <span>
            Đô thị <b>Kết nối</b>
            <small>CÙNG XÂY THÀNH PHỐ ĐÁNG SỐNG</small>
          </span>
        </Link>
        <div>
          <div className="eyebrow light">
            TIẾNG NÓI CỦA BẠN, THAY ĐỔI CỦA THÀNH PHỐ
          </div>
          <h1>
            Mỗi phản ánh.
            <br />
            Một thay đổi
            <br />
            <em>tích cực.</em>
          </h1>
          <p>
            Từ những con đường an toàn hơn đến không gian sống xanh hơn. Cùng
            kết nối để thành phố ngày một tốt đẹp.
          </p>
          <div className="auth-trust">
            <ShieldCheck />
            <span>Thông tin cá nhân và vị trí của bạn được bảo vệ.</span>
          </div>
        </div>
        <small>© {new Date().getFullYear()} Đô thị Kết nối</small>
        <div className="auth-circles" />
      </aside>
      <main className="auth-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={17} /> Về trang chủ
        </Link>
        <div className="auth-form-wrap">
          <span className="auth-form-icon">
            <LockKeyhole size={26} />
          </span>
          <div className="eyebrow">CHÀO MỪNG BẠN</div>
          <h2>{registerMode ? "Bắt đầu kết nối" : "Đăng nhập tài khoản"}</h2>
          <p>
            {registerMode
              ? "Tạo tài khoản để gửi và theo dõi phản ánh của bạn."
              : "Tiếp tục đồng hành cùng thành phố của chúng ta."}
          </p>
          <form className="stack" onSubmit={submit}>
            {error && <InlineAlert type="error">{error}</InlineAlert>}
            {registerMode ? (
              <>
                <Field label="Họ và tên" required>
                  <input
                    className="input"
                    autoComplete="name"
                    placeholder="Nguyễn Văn An"
                    required
                    maxLength={120}
                    {...field("name")}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Email" required>
                    <input
                      className="input"
                      type="email"
                      autoComplete="email"
                      placeholder="ban@email.com"
                      required
                      {...field("email")}
                    />
                  </Field>
                  <Field label="Số điện thoại" required>
                    <input
                      className="input"
                      type="tel"
                      autoComplete="tel"
                      placeholder="09xxxxxxxx"
                      required
                      pattern="[+]?[0-9]{9,15}"
                      {...field("phone")}
                    />
                  </Field>
                </div>
                <Field label="Địa chỉ liên hệ">
                  <input
                    className="input"
                    autoComplete="street-address"
                    placeholder="Phường, quận, thành phố"
                    maxLength={255}
                    {...field("address")}
                  />
                </Field>
              </>
            ) : (
              <Field label="Email hoặc số điện thoại" required>
                <input
                  className="input"
                  autoComplete="username"
                  placeholder="Nhập email hoặc số điện thoại"
                  required
                  {...field("identifier")}
                />
              </Field>
            )}
            <Field
              label="Mật khẩu"
              required
              hint={
                registerMode
                  ? "Ít nhất 10 ký tự. Nên kết hợp chữ, số và ký tự đặc biệt."
                  : undefined
              }
            >
              <div className="password-input">
                <input
                  className="input"
                  type={visible ? "text" : "password"}
                  autoComplete={
                    registerMode ? "new-password" : "current-password"
                  }
                  minLength={registerMode ? 10 : undefined}
                  placeholder="Nhập mật khẩu"
                  required
                  {...field("password")}
                />
                <button
                  type="button"
                  aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </Field>
            {registerMode && (
              <>
                <Field label="Nhập lại mật khẩu" required>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Xác nhận mật khẩu"
                    required
                    {...field("confirmPassword")}
                  />
                </Field>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => setAgree(event.target.checked)}
                    required
                  />
                  <span>
                    Tôi đồng ý cung cấp thông tin chính xác để xử lý phản ánh và
                    nhận thông báo liên quan.
                  </span>
                </label>
              </>
            )}
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Đang xử lý…"
                : registerMode
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="auth-switch">
            {registerMode ? "Đã có tài khoản?" : "Bạn chưa có tài khoản?"}{" "}
            <Link
              to={registerMode ? "/login" : "/register"}
              state={location.state}
            >
              {registerMode ? "Đăng nhập" : "Đăng ký ngay"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
