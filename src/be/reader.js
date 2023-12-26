function plugin() {
  document.addEventListener("keydown", (e) => {
    if (e.key == "ArrowRight") {
      window.parent.postMessage("nextpage", "*");
    } else if (e.key == "ArrowLeft") {
      window.parent.postMessage("prevpage", "*");
    }
  });
}
window.onload = function () {
  plugin();
};
