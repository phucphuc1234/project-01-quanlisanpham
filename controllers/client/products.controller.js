const Product = require("../../models/products.model");
module.exports.index = async (req, res) => {
    const products = await Product.find({
    }).sort({ position: "desc" });
    console.log(products);
    products.forEach((item) => {
        item.newprice = (item.price * (100 - item.discountPercentage) / 100).toFixed(0);
    });
    res.render("client/pages/products/index", {
        pagetitle: "danh sách sản phẩm",
        products: products
    });
};
module.exports.detail = async (req, res) => {
    try {
        const find = {
            deleted: false,
            slug: req.params.slug
        }
        const product = await Product.findOne(find);
        res.render("client/pages/products/detail", {
            pagetitle: product.title,
            product: product
        })
    } catch (error) {
        res.redirect(`/products`);
    }
}
