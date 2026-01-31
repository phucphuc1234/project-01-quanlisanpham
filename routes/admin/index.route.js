const system = require("../../config/system");
const dashboardtroute = require("./dashboard.route");
const productroute = require("./product.route");
module.exports = (app) => {
    const PATH_ADMIN = system.prefixAdmin;
    app.use(PATH_ADMIN + "/dashboard", dashboardtroute);
    app.use(PATH_ADMIN + "/products", productroute);
} 