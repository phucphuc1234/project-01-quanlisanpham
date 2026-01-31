module.exports.createPost = async (req, res, next) => {
    if (!req.body.title) {
        req.flash("eror", "vui lòng nhập tiêu đề sản phẩm!");
        res.redirect(req.headers.referer || "/admin/products");
        return
    }
    next();
}