# Urban Feedback API contract

React frontend and Express backend are separate projects. Database is real SQL Server using the user's schema (15 Vietnamese-named tables), not MongoDB or an in-memory substitute. UI language: Vietnamese. Prefix: `/api`. JSON errors: `{message, errors?}`. IDs are strings, dates ISO. All list endpoints return `{items,total,page,pageSize}` unless specified. `fetch` uses `credentials:'include'`; authentication uses HTTP-only JWT cookie (Bearer may also be supported). Auth response `{user}`; no token storage is required. Roles: `VT01` citizen, `VT02` intake, `VT03` processing unit, `VT04` inspector, `VT05` admin.

## Models
- User: `{id,name,email,phone,address,role,roleName,unitId,unitName,active}`.
- Category: `{id,name,description,active}`.
- Unit: `{id,name,type,address,phone,email,active}`.
- Report summary: `{id,title,description,address,latitude,longitude,categoryId,categoryName,status,priority,createdAt,unitId,unitName,dueAt,thumbnail}`. Never expose citizen personal contact information on public endpoints. Public users only access CLOSED reports, and exact coordinates are withheld for public requests. Other roles see own/authorized reports only. Staff coordinates are available for handling.
- Report detail adds `{images,history,assignments,progress,results,feedback,reopens,ownerId}`. Images `{id,url,type}`; history `{id,fromStatus,toStatus,note,createdAt,actorName}`; assignments `{id,unitId,unitName,dueAt,note,status}`; progress `{id,note,imageUrl,createdAt,actorName}`; results `{id,note,imageUrl,status,createdAt}`; feedback `{id,rating,comment,createdAt}`; reopens `{id,reason,description,status,note,createdAt}`. Public details redact ownerId, personal coordinates and private workflow notes.
- Statuses: `SUBMITTED, VERIFIED, REJECTED, ASSIGNED, IN_PROGRESS, WAITING_ACCEPTANCE, CLOSED, REOPENED`. Priorities: `LOW,NORMAL,HIGH,URGENT`.

## Auth and metadata
- POST `/auth/register` `{name,email,phone,password,address?}` creates citizen only; returns `{user}` and sets cookie.
- POST `/auth/login` `{identifier,password}` (email/phone); returns `{user}` and sets cookie.
- POST `/auth/logout`; GET `/auth/me` -> `{user}` (401 if anonymous).
- GET `/meta` public -> `{categories,units,roles}` (active metadata; admin receives inactive as well). Roles `{id,name}`.
- POST `/uploads`, authenticated multipart `files` (up to 5 JPEG/PNG/WebP, 5MB each) -> `{files:[{url,name}]}`. Validate magic bytes. Serve uploaded images only to authenticated users and authorized report viewers where practical; public completed reports may expose only outcome evidence with no personal metadata. Strip image metadata when possible. Only accept server-owned upload URLs in report workflow.

## Reports
- GET `/reports` query `{search,status,categoryId,unitId,from,to,area,mine,page,pageSize}`. Citizen sees own reports plus CLOSED public reports; `mine=true` restricts to own. Anonymous sees CLOSED only. Unit staff sees reports assigned to their unit. Intake/inspector/admin may see all for workflow. `pageSize` max100, default12.
- GET `/reports/:id` authorized or public CLOSED.
- POST `/reports/check-duplicates` authenticated `{categoryId,address,latitude,longitude}` -> `{items:[report summaries with distanceMeters,similarity],radiusMeters:200}`. Same category, 30 days, open statuses, Haversine distance <=200m. No exact citizen/location leakage to other citizens: return distance and approximate address, not exact coordinates or owner details. Reject missing/invalid coordinates.
- POST `/reports` citizen (admin may also submit) JSON `{title,description,categoryId,address,latitude,longitude,priority?,images:[url],confirmDuplicate?:boolean}` -> `{report}`. Require image and valid location. If duplicates and not confirmed, return409 `{message,duplicates:[...]}`. Store SUBMITTED, image rows, history, intake notifications transactionally.
- POST `/reports/:id/actions` with `{action,note?,categoryId?,priority?,unitId?,dueAt?,images?:[url]}` -> `{report}`. Authorized roles/state only, transactions and concurrent-state checks. Actions:
  - `verify`: intake/admin, SUBMITTED -> VERIFIED; classification and priority editable.
  - `reject`: intake/admin, SUBMITTED -> REJECTED; require note.
  - `assign`: intake/admin, VERIFIED or REOPENED -> ASSIGNED; active unit + future dueAt required.
  - `accept-task`: own unit/admin, ASSIGNED -> IN_PROGRESS.
  - `return-task`: own unit/admin, ASSIGNED -> VERIFIED; require note; assignment RETURN_REQUESTED.
  - `progress`: own unit/admin, IN_PROGRESS; require note; optional image; insert progress without changing report state.
  - `submit-result`: own unit/admin, IN_PROGRESS -> WAITING_ACCEPTANCE; require note and after-image.
  - `accept-result`: inspector/admin, WAITING_ACCEPTANCE -> CLOSED; save acceptance DAT/ACCEPTED and result ACCEPTED, mark assignment DONE.
  - `rework`: inspector/admin, WAITING_ACCEPTANCE -> IN_PROGRESS; require note; acceptance KHONG_DAT/REWORK_REQUIRED, result REJECTED.
- POST `/reports/:id/feedback` own citizen report CLOSED `{rating:1..5,comment?}` -> `{feedback}`. One active feedback per resolution cycle is sufficient; reject repeats.
- POST `/reports/:id/reopen` own CLOSED report with dissatisfied feedback (rating<=2) `{reason,description?}` -> `{reopen}`. Only one pending request.
- GET `/reopens` intake/inspector/admin -> list with `{id,reportId,reportTitle,reason,description,status,createdAt}`. Optional `status`.
- POST `/reopens/:id/decision` intake/inspector/admin `{approved:boolean,note}` -> `{reopen}`. A note of at least 3 characters is required for both approval and refusal. APPROVED reopens report to REOPENED (later assign). History + notifications transactionally.

## Notifications, administration and statistics
- GET `/notifications` authenticated query `{page,pageSize,unread?:true|false}` -> `{items:[{id,title,message,reportId,type,read,createdAt}],unread,total,allTotal,page,pageSize}`. `unread` and `allTotal` are global user counts; `total` reflects the current filter. PATCH `/notifications/:id/read`; POST `/notifications/read-all`.
- POST/PATCH `/admin/categories[/:id]` admin `{name,description,active?}` -> `{item}`.
- POST/PATCH `/admin/units[/:id]` admin `{name,type,address,phone,email,active?}` -> `{item}`.
- GET `/admin/users` admin -> list; PATCH `/admin/users/:id` `{role,unitId,active}` -> `{user}`. Prevent deactivating/demoting last active admin. Role VT03 must have active unit.
- GET `/stats` public only aggregates over CLOSED reports; authenticated scoped like reports. Same filters as reports. Returns `{total,submitted,inProgress,closed,overdue,resolutionRate,averageDays,byStatus:[{status,count}],byCategory:[{id,name,count}],byUnit:[{id,name,count}],byMonth:[{month,count,closed}]}`. UI statistics applies available filters. Public identity/contact data never included.

All mutations validate input, enforce authorization on the server, and use parameterized SQL. Prefer HTTP-only SameSite=Lax cookie plus Origin checks for mutation CSRF. Passwords hashed with bcrypt. No generic arbitrary SQL endpoints. Frontend must show loading/error/empty/success states and refresh API data after changes.
