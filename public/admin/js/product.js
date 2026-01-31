
// changestatus
const buttonChangeStatus = document.querySelectorAll("[button-change-status]");
if (buttonChangeStatus.length > 0) {
    const formchangestatus = document.querySelector("#form-change-status");
    const path = formchangestatus.getAttribute("data-path");
    buttonChangeStatus.forEach(button => {
        button.addEventListener("click", () => {
            const statuscurrent = button.getAttribute("data-status");
            const id = button.getAttribute("data-id");
            let newstatus = statuscurrent == "active" ? "inactive" : "active";
            const action = path + `/${newstatus}/${id}?_method=PATCH`;
            formchangestatus.action = action;
            formchangestatus.submit();

        });
    });
}
// end changestatus
// delete item
const buttonDelete = document.querySelectorAll("[button-delete]");
if (buttonDelete.length > 0) {
    const formchangedelete = document.querySelector("#delete-change-item");
    const path = formchangedelete.getAttribute("data-path");
    buttonDelete.forEach(button => {
        button.addEventListener("click", () => {
            const confirmis = confirm("bạn chắc chắn muốn xóa sản phẩm này?");
            if (confirmis) {
                const id = button.getAttribute("data-id");
                const action = `${path}/${id}?_method=DELETE`;
                formchangedelete.action = action;
                formchangedelete.submit();
            }
        });
    });
}
// end delete item