function plugin() {
  document.addEventListener("keydown", (e) => {
    console.log("key pressed", e);
    if (e.key == "ArrowRight") {
      window.parent.postMessage("nextpage", "*");
    } else if (e.key == "ArrowLeft") {
      window.parent.postMessage("prevpage", "*");
    }
  });
  console.log("plugin injected!");
}
window.onload = function () {
  plugin();
};
