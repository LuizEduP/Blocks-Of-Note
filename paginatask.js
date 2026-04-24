// CONTROLE DE URGÊNCIA
const cubeMain = document.getElementById("cube");
const selectUrgency = document.getElementById("urgencySelect");

if (cubeMain && selectUrgency) {
    selectUrgency.addEventListener("change", () => {
        cubeMain.classList.remove("low", "medium", "high", "extra");

        if (selectUrgency.value == "1") {
            cubeMain.classList.add("low");
        } else if (selectUrgency.value == "2") {
            cubeMain.classList.add("medium");
        } else if (selectUrgency.value == "3") {
            cubeMain.classList.add("high");
        }
    });
}