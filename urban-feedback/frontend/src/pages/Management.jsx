import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Download, Filter, FolderTree, Pencil, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Users, Building2, X, BarChart3, Clock3, CircleCheck, ClipboardList, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../lib/api';
import { useAuth, useMeta, useToast } from '../lib/context';
import { PageHeading, EmptyState, LoadingState, ErrorState, Modal, Field } from '../components/ui';
import { statusLabels, dateLabel } from '../lib/utils';
import './Management.css';

const roles = { VT01: 'Người dân', VT02: 'Cán bộ tiếp nhận', VT03: 'Đơn vị xử lý', VT04: 'Cán bộ nghiệm thu', VT05: 'Quản trị viên' };
const palette = ['#0b8c79', '#73b7a5', '#f0b45c', '#223f57', '#9baab8', '#7f8db5', '#d88c70', '#aed6c5'];
const reopenStatus = { PENDING: 'Chờ xem xét', APPROVED: 'Đã chấp nhận', REJECTED: 'Đã từ chối' };
const blankFilters = { from: '', to: '', categoryId: '', unitId: '', status: '', area: '' };
const listPageSize = 20;

function ListPagination({ page, total, onChange, loading }) {
  const pages = Math.max(1, Math.ceil(total / listPageSize));
  if (total <= listPageSize && page === 1) return null;
  return <nav className="management-pagination" aria-label="Phân trang danh sách"><span>{total ? `${(page - 1) * listPageSize + 1}–${Math.min(page * listPageSize, total)} / ${total} kết quả` : 'Không có kết quả'}</span><div><button className="btn btn-secondary btn-small" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={15} />Trang trước</button><span className="management-page-number" aria-live="polite">{page} / {pages}</span><button className="btn btn-secondary btn-small" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>Trang sau<ChevronRight size={15} /></button></div></nav>;
}

function queryString(values) {
  const entries = Object.entries(values).filter(([, value]) => value !== '' && value != null);
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : '';
}

function ActiveBadge({ active }) {
  return <span className={`management-badge ${active ? 'is-green' : 'is-gray'}`}>{active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>;
}

export function AdminPage() {
  const { user } = useAuth();
  const { meta, refreshMeta } = useMeta();
  const toast = useToast();
  const [tab, setTab] = useState('categories');
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [usersQuery, setUsersQuery] = useState({ page: 1, search: '' });
  const [search, setSearch] = useState('');
  const loadRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    const request = ++loadRequest.current;
    setLoading(true);
    setError('');
    try {
      const [, data] = await Promise.all([refreshMeta(), api(`/admin/users${queryString({ ...usersQuery, pageSize: listPageSize })}`)]);
      if (request !== loadRequest.current) return;
      const total = Number(data.total || 0);
      const lastPage = Math.max(1, Math.ceil(total / listPageSize));
      if (usersQuery.page > lastPage) {
        setUsersQuery(previous => ({ ...previous, page: lastPage }));
        return;
      }
      setUsers(data.items || []);
      setUsersTotal(total);
      if (!usersQuery.search) setUserCount(total);
    } catch (err) { if (request === loadRequest.current) setError(err.message); }
    finally { if (request === loadRequest.current) setLoading(false); }
  }
  useEffect(() => { load(); return () => { loadRequest.current += 1; }; }, [usersQuery.page, usersQuery.search]);
  useEffect(() => {
    if (tab !== 'users') return;
    const timer = setTimeout(() => setUsersQuery(previous => previous.search === search.trim() ? previous : { page: 1, search: search.trim() }), 300);
    return () => clearTimeout(timer);
  }, [search, tab]);

  function edit(kind, item) {
    setDialog({ kind, item });
    setForm(item ? { ...item } : kind === 'categories' ? { name: '', description: '', active: true } : { name: '', type: '', address: '', phone: '', email: '', active: true });
    setFormError('');
  }
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { kind, item } = dialog;
      let body;
      if (kind === 'users') {
        body = { role: form.role, unitId: form.role === 'VT03' ? form.unitId : null, active: Boolean(form.active) };
      } else if (kind === 'categories') {
        body = { name: form.name.trim(), description: form.description?.trim() || '', active: Boolean(form.active) };
      } else {
        body = { name: form.name.trim(), type: form.type?.trim() || '', address: form.address?.trim() || '', phone: form.phone?.trim() || null, email: form.email?.trim() || null, active: Boolean(form.active) };
      }
      await api(`/admin/${kind}${item ? `/${encodeURIComponent(item.id)}` : ''}`, { method: item ? 'PATCH' : 'POST', body });
      setDialog(null);
      toast(item ? 'Đã lưu thay đổi.' : 'Đã thêm mới thành công.');
      await load();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  const source = tab === 'users' ? users : meta?.[tab] || [];
  const visible = tab === 'users' ? users : source.filter(item => [item.name, item.email, item.phone, item.id].some(value => String(value || '').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));
  const names = { categories: 'loại phản ánh', units: 'đơn vị xử lý', users: 'người dùng' };

  return <div className="management-page">
    <PageHeading eyebrow="QUẢN TRỊ HỆ THỐNG" title="Danh mục & người dùng" description="Quản lý nguồn lực, phân quyền và cấu hình danh mục của thành phố." actions={<button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Làm mới</button>} />
    <div className="management-summary">
      {[['categories', FolderTree, 'Loại phản ánh', meta?.categories?.length], ['units', Building2, 'Đơn vị xử lý', meta?.units?.length], ['users', Users, 'Tài khoản', userCount]].map(([key, Icon, label, count]) => <button key={key} className={`management-summary-card ${tab === key ? 'selected' : ''}`} onClick={() => { setTab(key); setSearch(''); }}><span className="management-summary-icon"><Icon size={21} /></span><span><strong>{count ?? '—'}</strong><small>{label}</small></span><ChevronRight size={17} /></button>)}
    </div>
    <section className="panel management-panel">
      <div className="management-panel-toolbar">
        <div className="tabs" role="tablist" aria-label="Danh mục quản lý">
          {[['categories', 'Loại phản ánh'], ['units', 'Đơn vị xử lý'], ['users', 'Người dùng']].map(([key, label]) => <button role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'active' : ''}`} key={key} onClick={() => { setTab(key); setSearch(''); }}>{label}</button>)}
        </div>
        {tab !== 'users' && <button className="btn btn-primary" onClick={() => edit(tab)}><Plus size={16} /> Thêm {names[tab]}</button>}
      </div>
      <div className="management-search-row"><label className="management-search"><Search size={17} /><input className="input" type="search" maxLength={150} placeholder={`Tìm ${names[tab]}...`} aria-label={`Tìm ${names[tab]}`} value={search} onChange={event => setSearch(event.target.value)} /></label><span className="muted">{tab === 'users' ? usersTotal : visible.length} {names[tab]}</span></div>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={load} /> : !visible.length ? <EmptyState title="Chưa có kết quả" description={search ? 'Thử thay đổi từ khóa tìm kiếm.' : `Thêm ${names[tab]} đầu tiên để bắt đầu.`} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>{tab === 'users' ? 'Người dùng' : 'Tên danh mục'}</th><th>{tab === 'categories' ? 'Mô tả' : tab === 'units' ? 'Thông tin liên hệ' : 'Vai trò / đơn vị'}</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}>
        <td><strong>{item.name}</strong><div className="management-table-secondary">{tab === 'users' ? item.email : item.id}{item.id === user?.id ? ' · Bạn' : ''}</div></td>
        <td>{tab === 'categories' ? <span className="management-cell-description">{item.description || 'Chưa có mô tả'}</span> : tab === 'units' ? <><div>{item.email || 'Chưa có email'}</div><small className="muted">{item.phone || item.type || 'Chưa có số điện thoại'}</small></> : <><div>{roles[item.role] || item.roleName}</div><small className="muted">{item.unitName || '—'}</small></>}</td>
        <td><ActiveBadge active={item.active} /></td>
        <td><button className="btn btn-secondary btn-small" onClick={() => edit(tab, item)} aria-label={`Chỉnh sửa ${item.name}`}><Pencil size={14} /> Chỉnh sửa</button></td>
      </tr>)}</tbody></table></div>}
      {tab === 'users' && !error && <ListPagination page={usersQuery.page} total={usersTotal} loading={loading} onChange={page => setUsersQuery(previous => ({ ...previous, page }))} />}
    </section>
    {dialog && <Modal title={`${dialog.item ? 'Chỉnh sửa' : 'Thêm'} ${names[dialog.kind]}`} onClose={() => !saving && setDialog(null)}><form onSubmit={save} className="stack management-form">
      {dialog.kind === 'users' ? <><div className="management-person"><span>{form.name?.charAt(0)}</span><div><strong>{form.name}</strong><small>{form.email}</small></div></div><Field label="Vai trò"><select className="select" value={form.role || ''} onChange={event => change('role', event.target.value)} required>{(meta?.roles?.length ? meta.roles : Object.entries(roles).map(([id, name]) => ({ id, name }))).map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></Field>{form.role === 'VT03' && <Field label="Đơn vị phụ trách"><select className="select" required value={form.unitId || ''} onChange={event => change('unitId', event.target.value)}><option value="">Chọn đơn vị</option>{meta?.units?.filter(unit => unit.active || unit.id === form.unitId).map(unit => <option key={unit.id} value={unit.id}>{unit.name}{!unit.active ? ' (ngừng hoạt động)' : ''}</option>)}</select></Field>}</> : <><Field label={dialog.kind === 'categories' ? 'Tên loại phản ánh *' : 'Tên đơn vị *'}><input className="input" required maxLength={150} value={form.name || ''} onChange={event => change('name', event.target.value)} autoFocus /></Field>{dialog.kind === 'categories' ? <Field label="Mô tả"><textarea className="textarea" rows={3} maxLength={500} value={form.description || ''} onChange={event => change('description', event.target.value)} /></Field> : <><Field label="Lĩnh vực phụ trách"><input className="input" maxLength={100} value={form.type || ''} onChange={event => change('type', event.target.value)} /></Field><div className="form-grid"><Field label="Email"><input className="input" type="email" maxLength={150} value={form.email || ''} onChange={event => change('email', event.target.value)} /></Field><Field label="Số điện thoại"><input className="input" type="tel" maxLength={20} value={form.phone || ''} onChange={event => change('phone', event.target.value)} /></Field></div><Field label="Địa chỉ"><input className="input" maxLength={255} value={form.address || ''} onChange={event => change('address', event.target.value)} /></Field></>}</>}
      <label className="management-checkbox"><input type="checkbox" checked={Boolean(form.active)} onChange={event => change('active', event.target.checked)} />Đang hoạt động</label>
      {formError && <div className="inline-error" role="alert">{formError}</div>}
      <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setDialog(null)} disabled={saving}>Hủy</button><button className="btn btn-primary" disabled={saving}><Check size={16} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
    </form></Modal>}
  </div>;
}

export function StatisticsPage() {
  const { meta } = useMeta();
  const [filters, setFilters] = useState(blankFilters);
  const [applied, setApplied] = useState(blankFilters);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load(next = applied) {
    setLoading(true); setError('');
    try { setStats(await api(`/stats${queryString(next)}`)); setApplied({ ...next }); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(blankFilters); }, []);
  const setFilter = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  function download() {
    if (!stats) return;
    const safe = value => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const rows = [['BÁO CÁO PHẢN ÁNH HẠ TẦNG ĐÔ THỊ'], ['Từ ngày', applied.from || 'Tất cả', 'Đến ngày', applied.to || 'Tất cả'], ['Tổng phản ánh', stats.total], ['Đã giải quyết', stats.closed], ['Tỷ lệ giải quyết (%)', stats.resolutionRate], [], ['Theo trạng thái', 'Số lượng'], ...(stats.byStatus || []).map(item => [statusLabels[item.status] || item.status, item.count]), [], ['Theo loại phản ánh', 'Số lượng'], ...(stats.byCategory || []).map(item => [item.name, item.count]), [], ['Theo đơn vị', 'Số lượng'], ...(stats.byUnit || []).map(item => [item.name || 'Chưa phân công', item.count]), [], ['Tháng', 'Tiếp nhận', 'Đã giải quyết'], ...(stats.byMonth || []).map(item => [item.month, item.count, item.closed])];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `bao-cao-phan-anh-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  const byStatus = (stats?.byStatus || []).filter(item => item.count > 0).map(item => ({ ...item, name: statusLabels[item.status] || item.status }));
  const cards = [[ClipboardList, 'Tổng phản ánh', stats?.total, 'Trong phạm vi thống kê'], [CircleCheck, 'Đã giải quyết', stats?.closed, `${Number(stats?.resolutionRate || 0).toFixed(1)}% tổng phản ánh`], [Clock3, 'Đang xử lý', stats?.inProgress, 'Theo dõi tiến độ thực hiện'], [TrendingUp, 'Thời gian trung bình', `${Number(stats?.averageDays || 0).toFixed(1)} ngày`, 'Từ tiếp nhận đến hoàn thành']];
  return <div className="management-page">
    <PageHeading eyebrow="DỮ LIỆU ĐÔ THỊ" title="Báo cáo & thống kê" description="Theo dõi hiệu quả tiếp nhận, xử lý và chất lượng phục vụ người dân." actions={<button className="btn btn-secondary" onClick={download} disabled={!stats || loading}><Download size={16} /> Xuất báo cáo</button>} />
    <form className="panel statistics-filters" onSubmit={event => { event.preventDefault(); load(filters); }}>
      <div className="management-section-heading"><span><SlidersHorizontal size={17} /> Bộ lọc báo cáo</span><button type="button" className="management-text-button" onClick={() => { setFilters(blankFilters); load(blankFilters); }}>Đặt lại</button></div>
      <div className="statistics-filter-grid"><Field label="Từ ngày"><input className="input" type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)} max={filters.to || undefined} /></Field><Field label="Đến ngày"><input className="input" type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)} min={filters.from || undefined} /></Field><Field label="Loại phản ánh"><select className="select" value={filters.categoryId} onChange={event => setFilter('categoryId', event.target.value)}><option value="">Tất cả loại phản ánh</option>{meta?.categories?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Đơn vị xử lý"><select className="select" value={filters.unitId} onChange={event => setFilter('unitId', event.target.value)}><option value="">Tất cả đơn vị</option>{meta?.units?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Trạng thái"><select className="select" value={filters.status} onChange={event => setFilter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Khu vực"><input className="input" placeholder="Tên đường, phường..." value={filters.area} onChange={event => setFilter('area', event.target.value)} /></Field></div>
      <div className="form-actions"><button className="btn btn-primary" disabled={loading}><Filter size={16} />{loading ? 'Đang thống kê...' : 'Xem thống kê'}</button></div>
    </form>
    {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={() => load()} /> : !stats ? <EmptyState title="Chưa có dữ liệu" description="Chọn điều kiện để xem báo cáo." /> : <>
      <div className="stat-grid management-stat-grid">{cards.map(([Icon, label, value, description]) => <article className="stat-card" key={label}><div className="management-stat-title"><span>{label}</span><Icon size={18} /></div><strong className="management-stat-value">{value ?? 0}</strong><small className="muted">{description}</small></article>)}</div>
      {stats.total === 0 ? <div className="panel"><EmptyState title="Không có phản ánh phù hợp" description="Thử mở rộng khoảng thời gian hoặc thay đổi bộ lọc để xem dữ liệu." /></div> : <>
        <div className="statistics-chart-grid"><section className="panel statistics-chart-panel"><div className="management-section-heading"><span>Tiếp nhận & giải quyết theo tháng</span><BarChart3 size={18} /></div><p className="muted">Số phản ánh tiếp nhận và đã hoàn tất trong kỳ</p>{stats.byMonth?.length ? <div className="statistics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byMonth} barGap={5} margin={{ top: 16, right: 12, bottom: 4, left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8efed" /><XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} /><YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e1e9e6', fontSize: 13 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="count" name="Tiếp nhận" fill="#a6d3c5" radius={[4, 4, 0, 0]} maxBarSize={32} /><Bar dataKey="closed" name="Đã giải quyết" fill="#0b8c79" radius={[4, 4, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer></div> : <EmptyState title="Chưa có dữ liệu theo tháng" />}</section><section className="panel statistics-chart-panel"><div className="management-section-heading"><span>Tình trạng xử lý</span><span className="management-count">{stats.total} phản ánh</span></div>{byStatus.length ? <div className="statistics-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byStatus} dataKey="count" nameKey="name" innerRadius="52%" outerRadius="75%" paddingAngle={3}>{byStatus.map((item, index) => <Cell key={item.status} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e1e9e6', fontSize: 13 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div> : <EmptyState title="Chưa có dữ liệu" />}</section></div>
        <div className="statistics-bottom-grid"><section className="panel statistics-category-panel"><div className="management-section-heading"><span>Phân bố theo loại phản ánh</span><FolderTree size={17} /></div><div className="statistics-categories">{(stats.byCategory || []).map((item, index) => <div className="statistics-category" key={item.id || index}><div><span>{item.name}</span><strong>{item.count} <small>phản ánh</small></strong></div><div className="statistics-track"><span style={{ width: `${Math.min(100, item.count / Math.max(1, stats.total) * 100)}%`, background: palette[index % palette.length] }} /></div></div>)}</div></section><section className="panel statistics-unit-panel"><div className="management-section-heading"><span>Hiệu quả theo đơn vị</span><Building2 size={17} /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Đơn vị xử lý</th><th>Số phản ánh</th><th>Tỷ trọng</th></tr></thead><tbody>{(stats.byUnit || []).map((item, index) => <tr key={item.id || index}><td>{item.name || 'Chưa phân công'}</td><td><strong>{item.count}</strong></td><td>{(item.count / Math.max(1, stats.total) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>{!stats.byUnit?.length && <EmptyState title="Chưa có dữ liệu đơn vị" />}</section></div>
      </>}
    </>}
  </div>;
}

export function ReopensPage() {
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loadRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  async function load() {
    const request = ++loadRequest.current;
    setLoading(true); setError('');
    try {
      const result = await api(`/reopens${queryString({ status, page, pageSize: listPageSize })}`);
      if (request !== loadRequest.current) return;
      const count = Number(result.total || 0);
      const lastPage = Math.max(1, Math.ceil(count / listPageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(result.items || []); setTotal(count);
    }
    catch (err) { if (request === loadRequest.current) setError(err.message); }
    finally { if (request === loadRequest.current) setLoading(false); }
  }
  useEffect(() => { load(); return () => { loadRequest.current += 1; }; }, [status, page]);
  function openDecision(item, approved) { setDecision({ item, approved }); setNote(''); setFormError(''); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      await api(`/reopens/${encodeURIComponent(decision.item.id)}/decision`, { method: 'POST', body: { approved: decision.approved, note: note.trim() } });
      toast(decision.approved ? 'Đã mở lại phản ánh để tiếp tục xử lý.' : 'Đã gửi quyết định đến người dân.');
      setDecision(null); await load();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }
  return <div className="management-page"><PageHeading eyebrow="CHẤT LƯỢNG PHỤC VỤ" title="Yêu cầu xem xét lại" description="Lắng nghe phản hồi và xem xét những kết quả người dân chưa hài lòng." actions={<button className="btn btn-secondary" disabled={loading} onClick={() => load()}><RefreshCw size={16} /> Làm mới</button>} />
    <section className="panel"><div className="management-panel-toolbar"><div className="tabs" role="tablist" aria-label="Trạng thái yêu cầu">{[['PENDING', 'Chờ xem xét'], ['APPROVED', 'Đã chấp nhận'], ['REJECTED', 'Đã từ chối'], ['', 'Tất cả']].map(([value, label]) => <button className={`tab ${value === status ? 'active' : ''}`} role="tab" aria-selected={value === status} key={value} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div><span className="muted management-total">{total} yêu cầu</span></div>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={() => load()} /> : items.length === 0 ? <EmptyState title="Không có yêu cầu trong mục này" description="Các yêu cầu xem xét lại kết quả xử lý sẽ xuất hiện tại đây." /> : <div className="reopen-list">{items.map(item => <article className="reopen-card" key={item.id}><div className="reopen-card-top"><div><span className="management-kicker">{item.reportId}</span><Link className="reopen-title" to={`/reports/${item.reportId}`}>{item.reportTitle || 'Xem phản ánh gốc'}<ChevronRight size={17} /></Link></div><span className={`management-badge ${item.status === 'PENDING' ? 'is-amber' : item.status === 'APPROVED' ? 'is-green' : 'is-gray'}`}>{reopenStatus[item.status] || item.status}</span></div><p className="reopen-reason">{item.reason}</p>{item.description && <p className="muted reopen-description">{item.description}</p>}<div className="reopen-card-bottom"><span className="muted"><Clock3 size={14} />{dateLabel(item.createdAt)}</span>{item.status === 'PENDING' && <div className="management-button-group"><button className="btn btn-secondary btn-small" onClick={() => openDecision(item, false)}><X size={15} /> Từ chối</button><button className="btn btn-primary btn-small" onClick={() => openDecision(item, true)}><Check size={15} /> Chấp nhận mở lại</button></div>}</div></article>)}</div>}
      {!error && <ListPagination page={page} total={total} loading={loading} onChange={setPage} />}
    </section>
    {decision && <Modal title={decision.approved ? 'Chấp nhận mở lại phản ánh' : 'Từ chối yêu cầu xem xét lại'} onClose={() => !saving && setDecision(null)}><form className="stack management-form" onSubmit={submit}><div className="management-dialog-context"><strong>{decision.item.reportTitle}</strong><p>{decision.item.reason}</p></div><Field label={decision.approved ? 'Nội dung xử lý *' : 'Lý do từ chối *'}><textarea className="textarea" rows={4} maxLength={1000} required minLength={3} value={note} onChange={event => setNote(event.target.value)} placeholder={decision.approved ? 'Ghi chú cho người dân và đơn vị xử lý...' : 'Giải thích rõ lý do giữ nguyên kết quả xử lý...'} autoFocus /></Field>{formError && <div className="inline-error" role="alert">{formError}</div>}<div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setDecision(null)} disabled={saving}>Hủy</button><button className={`btn ${decision.approved ? 'btn-primary' : 'btn-danger'}`} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận quyết định'}</button></div></form></Modal>}
  </div>;
}

export function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loadRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const request = ++loadRequest.current;
    setLoading(true); setError('');
    try {
      const result = await api(`/notifications${queryString({ page, pageSize: listPageSize, unread: filter === 'unread' ? true : undefined })}`);
      if (request !== loadRequest.current) return;
      const count = Number(result.total || 0);
      const lastPage = Math.max(1, Math.ceil(count / listPageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(result.items || []); setUnread(Number(result.unread || 0)); setTotal(count);
    }
    catch (err) { if (request === loadRequest.current) setError(err.message); }
    finally { if (request === loadRequest.current) setLoading(false); }
  }
  useEffect(() => { load(); return () => { loadRequest.current += 1; }; }, [filter, page]);
  async function markRead(item) {
    if (item.read || busy) return;
    setBusy(true);
    try { await api(`/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH' }); window.dispatchEvent(new Event('notifications-updated')); await load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  async function markAll() {
    setBusy(true);
    try { await api('/notifications/read-all', { method: 'POST' }); window.dispatchEvent(new Event('notifications-updated')); toast('Đã đánh dấu tất cả thông báo là đã đọc.'); await load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  const visible = items;
  return <div className="management-page"><PageHeading eyebrow="KẾT NỐI THÀNH PHỐ" title="Thông báo" description={unread ? `Bạn có ${unread} thông báo chưa đọc. Cập nhật mới nhất về các phản ánh của bạn.` : 'Theo dõi các cập nhật mới nhất về phản ánh và công việc của bạn.'} actions={<button className="btn btn-secondary" onClick={markAll} disabled={!unread || busy}><CheckCheck size={17} />{busy ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}</button>} />
    <section className="panel notification-panel"><div className="management-panel-toolbar"><div className="tabs" role="tablist" aria-label="Lọc thông báo"><button className={`tab ${filter === 'all' ? 'active' : ''}`} role="tab" aria-selected={filter === 'all'} onClick={() => { setFilter('all'); setPage(1); }}>Tất cả</button><button className={`tab ${filter === 'unread' ? 'active' : ''}`} role="tab" aria-selected={filter === 'unread'} onClick={() => { setFilter('unread'); setPage(1); }}>Chưa đọc {unread > 0 && <span className="management-count">{unread}</span>}</button></div><span className="muted management-total">{total} thông báo</span><button className="management-icon-button" aria-label="Làm mới thông báo" onClick={load} disabled={loading}><RefreshCw size={17} /></button></div>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={load} /> : visible.length === 0 ? <EmptyState title={filter === 'unread' ? 'Bạn đã đọc tất cả thông báo' : 'Chưa có thông báo'} description="Thông tin về tiến độ phản ánh và nhiệm vụ sẽ được cập nhật tại đây." /> : <div className="notification-list">{visible.map(item => <article className={`notification-item ${!item.read ? 'unread' : ''}`} key={item.id}><span className="notification-icon"><Bell size={19} /></span><div className="notification-body"><div className="notification-title-row"><strong>{item.title}</strong>{!item.read && <span className="notification-unread-dot" aria-label="Chưa đọc" />}</div><p>{item.message}</p><div className="notification-meta"><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>{item.reportId && <Link to={`/reports/${item.reportId}`} onClick={() => markRead(item)}>Xem phản ánh <ChevronRight size={13} /></Link>}</div></div>{!item.read && <button className="management-icon-button notification-read-button" disabled={busy} onClick={() => markRead(item)} aria-label={`Đánh dấu đã đọc: ${item.title}`} title="Đánh dấu đã đọc"><Check size={18} /></button>}</article>)}</div>}
      {!error && <ListPagination page={page} total={total} loading={loading || busy} onChange={setPage} />}
    </section>
  </div>;
}
