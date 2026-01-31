const Product = require("../../models/products.model");
const fitterhepers = require("../../helpers/fitterstatus");
const searchhepers = require("../../helpers/search");
const paginationhepers = require("../../helpers/pagination");
const config = require("../../config/system");
// [GET] admin/product
module.exports.index = async (req, res) => {
    // nút ấn hoạt động
    const fitter = fitterhepers(req.query);

    // //lọc trạng thái
    let find = {
        deleted: false
    }
    if (req.query.status) {
        find.status = req.query.status
    }
    const objsearch = searchhepers(req.query);
    if (objsearch.regex) {
        find.title = objsearch.regex;
    }
    // pagination
    const countproduct = await Product.countDocuments(find);
    const objpagination = paginationhepers(
        {
            currentpage: 1,
            limititem: 4
        },
        req.query,
        countproduct
    )

    // end đếm sp
    const products = await Product.find(find)
        .sort({ position: "desc" })
        .limit(objpagination.limititem)
        .skip(objpagination.skip);
    res.render("admin/pages/products/index", {
        pagetitle: "trang danh sách sản phẩm",
        products: products,
        fitter: fitter,
        keyword: objsearch.keyword,
        pagination: objpagination
    });
}
// [patch] admin/product/chang-status
module.exports.changestatus = async (req, res) => {
    console.log(req.params);
    const status = req.params.status;
    const id = req.params.id;
    await Product.updateOne({ _id: id }, { status: status });
    req.flash("success", "thay đổi trạng thái thành công");
    res.redirect(req.headers.referer || "/admin/products");
};
// [patch] admin/product/change-multi
module.exports.changemulti = async (req, res) => {
    console.log(req.body);//cài thư viện body parse
    const type = req.body.type;
    const ids = req.body.ids.split(", ");
    switch (type) {
        case "active":
            await Product.updateMany({ _id: { $in: ids } }, { status: "active" });
            req.flash("success", `thay đổi trạng thái thành công ${ids} sản phẩm`);
            break;
        case "inactive":
            await Product.updateMany({ _id: { $in: ids } }, { status: "inactive" });
            req.flash("success", `thay đổi trạng thái thành công ${ids} sản phẩm`);
            break;

        case "delete-all":
            await Product.updateMany({ _id: { $in: ids } }, { deleted: true, deletedAt: new Date() });
            req.flash("success", `xóa thành công ${ids} sản phẩm`);
            break;
        case "change-position":
            for (const item of ids) {
                let [id, position] = item.split("-");
                position = parseInt(position);
                await Product.updateOne({ _id: id }, { position: position });
            }
            req.flash("success", `thay đổi vị trí thành công ${ids} sản phẩm`);
            break;
        default:
            break;
    }
    res.redirect(req.headers.referer || "/admin/products");
};
// [delete] admin/product/delete
module.exports.deleteitem = async (req, res) => {
    const id = req.params.id;
    await Product.updateOne({ _id: id }, {
        deleted: true,
        deteledAt: new Date()
    });
    res.redirect(req.headers.referer || "/admin/products");
};
// [get] admin/product/create
module.exports.create = async (req, res) => {
    res.render("admin/pages/products/create", {
        pagetitle: "trang thêm mới sản phẩm"
    })
}
// [post] admin/product/create
module.exports.createPost = async (req, res) => {
    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);
    if (req.body.position == "") {
        const countproduct = await Product.countDocuments();
        req.body.position = countproduct + 1 // nếu ko nhập vị trí thì tự động tăng vị trí lên từ tổng sản phẩm
    }
    else {
        req.body.position = parseInt(req.body.position);
    }
    if (req.file) {
        req.body.thumbnail = `/uploads/${req.file.filename}`
    }
    const product = new Product(req.body);
    await product.save();
    res.redirect(`${config.prefixAdmin}/products`);
}
// [post] admin/product/edit
module.exports.edit = async (req, res) => {
    try {
        const find = {
            deleted: false,
            _id: req.params.id
        }
        const product = await Product.findOne(find);
        res.render("admin/pages/products/edit", {
            pagetitle: "trang sửa sản phẩm",
            product: product
        })
    } catch (error) {
        res.redirect(`${config.prefixAdmin}/products`);
    }
}
// [patch] admin/product/edit
module.exports.editPatch = async (req, res) => {
    const id = req.params.id;
    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);
    req.body.position = parseInt(req.body.position);
    if (req.file) {
        req.body.thumbnail = `/uploads/${req.file.filename}`
    }
    try {
        await Product.updateOne({ _id: id }, req.body);
        req.flash("success", `cập nhật sản phẩm thành công`);
    } catch (error) {
        req.flash("eror", `cập nhật sản phẩm thất bại`);
    }
    res.redirect(req.headers.referer);
};
// [post] admin/product/detail/id
module.exports.detail = async (req, res) => {
    try {
        const find = {
            deleted: false,
            _id: req.params.id
        }
        const product = await Product.findOne(find);
        res.render("admin/pages/products/detail", {
            pagetitle: "chi tiết sản phẩm ",
            product: product
        })
    } catch (error) {
        res.redirect(`${config.prefixAdmin}/products`);
    }
}
