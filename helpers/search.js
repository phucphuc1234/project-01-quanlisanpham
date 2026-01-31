module.exports = (query) => {
    objsearch = {
        keyword: ""
    }
    if (query.keyword) {
        objsearch.keyword = query.keyword;
        const regex = new RegExp(objsearch.keyword, "i");//hàm regex tìm sản phẩm
        objsearch.regex = regex;
    }
    return objsearch;
}