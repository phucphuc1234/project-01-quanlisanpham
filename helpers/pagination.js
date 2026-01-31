module.exports = (objpagination, query, countproduct) => {
    if (query.page) {
        objpagination.currentpage = parseInt(query.page);
    }
    objpagination.skip = (objpagination.currentpage - 1) * objpagination.limititem;
    // end pagination
    //đếm sản phẩm để chia trang
    const totalpage = Math.ceil(countproduct / objpagination.limititem);
    objpagination.totalpage = totalpage;
    return objpagination;
}