import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import { HttpError, requireAuth, asyncRoute } from '../lib.js';

import { uploadDirectory, validMagic } from '../image-storage.js';
export { validateImages, validMagic } from '../image-storage.js';

const router = Router();
const uploader = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 5 * 1024 * 1024, fields: 2 } });
router.post('/', requireAuth, uploader.array('files', 5), asyncRoute(async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'Vui lòng chọn ít nhất một ảnh JPEG, PNG hoặc WebP.');
  await fs.mkdir(uploadDirectory, { recursive: true });
  const saved = [];
  try {
    for (const file of req.files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) || !validMagic(file.buffer)) throw new HttpError(400, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ, tối đa 5 MB mỗi ảnh.');
      const fileName = `${req.user.id}--${randomUUID()}.webp`;
      let buffer;
      try {
        // Decode and re-encode: reject corrupt/polyglot uploads and remove EXIF/GPS metadata.
        buffer = await sharp(file.buffer, { limitInputPixels: 40000000, failOn: 'warning' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      } catch { throw new HttpError(400, 'Ảnh bị hỏng hoặc có kích thước quá lớn. Vui lòng chọn ảnh khác.'); }
      await fs.writeFile(path.join(uploadDirectory, fileName), buffer, { flag: 'wx' });
      saved.push({ url: `/uploads/${fileName}`, name: file.originalname.slice(0, 150) });
    }
  } catch (error) {
    await Promise.all(saved.map(file => fs.unlink(path.join(uploadDirectory, path.basename(file.url))).catch(() => {})));
    throw error;
  }
  res.status(201).json({ files: saved });
}));

export const serveUpload = asyncRoute(async (req, res) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9-]+--[a-f0-9-]{36}\.webp$/.test(name)) throw new HttpError(404, 'Không tìm thấy ảnh.');
  let allowed = req.user && name.startsWith(`${req.user.id}--`);
  if (!allowed) {
    const params = { url: `/uploads/${name}`, userId: req.user?.id || '', unitId: req.user?.unitId || '' };
    const role = req.user?.role;
    const staff = ['VT02', 'VT04', 'VT05'].includes(role);
    const rows = (await query(`SELECT TOP(1) ha.MaHinhAnh FROM dbo.HinhAnhPhanAnh ha JOIN dbo.PhanAnh pa ON pa.MaPhanAnh=ha.MaPhanAnh
      OUTER APPLY(SELECT TOP(1) MaDonVi FROM dbo.PhanCong WHERE MaPhanAnh=pa.MaPhanAnh ORDER BY NgayPhanCong DESC,MaPhanCong DESC) pc
      WHERE ha.DuongDan=@url AND ((pa.TrangThai='CLOSED' AND ha.LoaiAnh='SAU_XU_LY')
      OR pa.MaNguoiDung=@userId ${staff ? 'OR 1=1' : role === 'VT03' ? 'OR pc.MaDonVi=@unitId' : ''})`, params)).recordset;
    allowed = rows.length > 0;
  }
  if (!allowed) throw new HttpError(404, 'Không tìm thấy ảnh hoặc bạn không có quyền truy cập.');
  res.set('Cache-Control', 'private, no-store');
  res.type('image/webp').sendFile(path.join(uploadDirectory, name), error => { if (error && !res.headersSent) res.status(404).json({ message: 'Không tìm thấy ảnh.' }); });
});
export default router;
