import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "./api";
const AuthContext = createContext(null),
  MetaContext = createContext(null),
  ToastContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const useMeta = () => useContext(MetaContext);
export const useToast = () => useContext(ToastContext);

export function Providers({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [meta, setMeta] = useState({ categories: [], units: [], roles: [] }),
    [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      6000,
    );
  }, []);
  const refreshMeta = useCallback(async () => {
    try {
      const result = await api("/meta");
      setMeta(result);
    } catch {
      /* Each page reports its own connectivity error. */
    }
  }, []);
  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    refreshMeta();
  }, [refreshMeta, user?.id, user?.role]);
  const login = async (values) => {
    const data = await api("/auth/login", { method: "POST", body: values });
    setUser(data.user);
    return data.user;
  };
  const register = async (values) => {
    const data = await api("/auth/register", { method: "POST", body: values });
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      <MetaContext.Provider value={{ meta, refreshMeta }}>
        <ToastContext.Provider value={toast}>
          {children}
          <div className="toast-region" aria-live="polite">
            {toasts.map((item) => (
              <div
                key={item.id}
                className={`toast ${item.type}`}
                role={item.type === "error" ? "alert" : "status"}
              >
                {item.message}
                <button
                  aria-label="Đóng thông báo"
                  onClick={() =>
                    setToasts((values) =>
                      values.filter((value) => value.id !== item.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </MetaContext.Provider>
    </AuthContext.Provider>
  );
}

export function useApiData(path) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api(path, { signal: controller.signal })
      .then(setData)
      .catch((error) => {
        if (error.name !== "AbortError") setError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, error, loading, reload };
}
