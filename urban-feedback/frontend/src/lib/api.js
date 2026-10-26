export async function api(path, options = {}) {
  const init = {
    credentials: "include",
    ...options,
    headers: { ...options.headers },
  };
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    typeof init.body !== "string"
  ) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(init.body);
  }
  const response = await fetch(`/api${path}`, init);
  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(
      data?.message ||
        (response.status === 502
          ? "Chưa kết nối được máy chủ. Vui lòng thử lại sau."
          : "Không thể thực hiện yêu cầu."),
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null)
      params.set(key, String(value));
  });
  return params.toString();
}

export async function uploadFiles(files) {
  if (!files?.length) return [];
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("files", file));
  const result = await api("/uploads", { method: "POST", body: form });
  return result.files.map((file) => file.url);
}
