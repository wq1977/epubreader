function plugin() {
  document.addEventListener("keydown", (e) => {
    if (e.key == "ArrowRight") {
      window.parent.postMessage("nextpage", "*");
    } else if (e.key == "ArrowRight") {
      window.parent.postMessage("prevpage", "*");
    }
  });
}
export default plugin;
