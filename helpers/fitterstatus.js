module.exports = (query) => {
    let fitter = [
        {
            name: "Tất cả",
            status: "",
            class: ""
        },
        {
            name: "Hoạt động",
            status: "active",
            class: ""
        },
        {
            name: "Dừng hoạt động",
            status: "inactive",
            class: ""
        }
    ]
    if (query.status) {
        const index = fitter.findIndex(item => item.status == query.status);
        fitter[index].class = "active";
    } else {
        const index = fitter.findIndex(item => item.status == "");
        fitter[index].class = "active";
    }
    return fitter;
}