const productroute = require("./products.route");
const homecontroller = require("../../controllers/client/home.controller");
module.exports = (app) => {
    app.get("/", homecontroller.index);
    app.use("/products", productroute);
} 