// button status
const buttonstatus = document.querySelectorAll("[button-status]");
if (buttonstatus.length > 0) {
    let url = new URL(window.location.href)
    buttonstatus.forEach(button => {
        button.addEventListener("click", () => {
            const status = button.getAttribute("button-status");
            if (status) {
                url.searchParams.set("status", status);
            } else {
                url.searchParams.delete("status");
            }
            window.location.href = url.href;
        });
    });

}
// end button status
// formseacrh
const formseacrh = document.querySelector("#form-seacrh");
if (formseacrh) {
    let url = new URL(window.location.href)
    formseacrh.addEventListener("submit", (e) => {
        e.preventDefault();
        const keyword = e.target.elements.keyword.value;
        if (keyword) {
            url.searchParams.set("keyword", keyword);
        } else {
            url.searchParams.delete("keyword");
        }
        window.location.href = url.href;
    });
}
// end formseacrh
//nagination
const paginationbutton = document.querySelectorAll("[button-pagination]");
if (paginationbutton) {
    let url = new URL(window.location.href)
    paginationbutton.forEach(button => {
        button.addEventListener("click", () => {
            const page = button.getAttribute("button-pagination");
            url.searchParams.set("page", page);
            window.location.href = url.href;
        });
    });
}
// end nagination
//check box multi
const checkboxmulti = document.querySelector("[checkbox-multi]");
if (checkboxmulti) {
    const inputcheckall = checkboxmulti.querySelector("input[name='checkall']");
    const inputsid = checkboxmulti.querySelectorAll("input[name='id']");
    inputcheckall.addEventListener("click", () => {
        if (inputcheckall.checked) {
            inputsid.forEach(input => {
                input.checked = true;
            });
        }
        else {
            inputsid.forEach(input => {
                input.checked = false;
            });
        }
    });
    inputsid.forEach(input => {
        input.addEventListener("click", () => {
            const countchecked = checkboxmulti.querySelectorAll("input[name='id']:checked").length;// lấy độ dài của id coi nếu bằng count bằng id.lenght thì true ko  thì false;
            if (countchecked == inputsid.length) {
                inputcheckall.checked = true;
            }
            else {
                inputcheckall.checked = false;
            }
        });

    });
}
//end check box multi
//form chang multi
const formchangemulti = document.querySelector("[form-change-multi]");
if (formchangemulti) {
    formchangemulti.addEventListener("submit", (e) => {
        e.preventDefault();
        const checkboxmulti = document.querySelector("[checkbox-multi]");
        const idchecked = checkboxmulti.querySelectorAll("input[name='id']:checked");
        const typechange = e.target.elements.type.value;
        console.log(typechange);
        if (typechange == "delete-all") {
            const confirmis = confirm("bạn chắc chắn muốn xóa");
            if (!confirmis) {
                return;
            }
        }
        if (idchecked.length > 0) {
            let ids = [];
            const inputchecked = formchangemulti.querySelector("input[name='ids']");
            idchecked.forEach(input => {
                const id = input.value;
                if (typechange == "change-position") {
                    const position = input.closest("tr")//thẻ cha mới lấy dc của thẻ td con
                        .querySelector("input[name='position']").value;
                    ids.push(`${id}-${position}`);
                } else {
                    ids.push(id);
                }
            });
            inputchecked.value = ids.join(", ");
            formchangemulti.submit();
        }
        else {
            alert("vui lòng chọn ít nhất một bảng ghi");
        }
    });
}
//end form change  multi
// show alert
const Showalert = document.querySelector("[show-alert]");
if (Showalert) {
    const time = parseInt(Showalert.getAttribute("data-time"));

    const close = Showalert.querySelector("[close-alert]")
    setTimeout(() => {
        Showalert.classList.add("alert-hidden");
    }, time)
    close.addEventListener("click", () => {
        Showalert.classList.add("alert-hidden");
    });
}
//end show alert
//upload-image
const uploadimg = document.querySelector("[upload-image]");
if (uploadimg) {
    const uploadinputimg = document.querySelector("[upload-image-input]");
    const uploadpreview = document.querySelector("[upload-image-preview]");
    const closeimg = document.querySelector(".close-img");
    uploadinputimg.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadpreview.src = URL.createObjectURL(file);
            closeimg.classList.remove("alert-hidden"); // hiện nút X
        }
    });
    closeimg.addEventListener("click", () => {
        uploadpreview.src = "";
        uploadinputimg.value = "";
        closeimg.classList.add("alert-hidden"); // ẩn lại
    });
}

//endupload-image
