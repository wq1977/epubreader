function plugin() {
  var isScrolling,
    isAtBottom = null,
    isAtTop = null;
  document.addEventListener("wheel", function (event) {
    clearTimeout(isScrolling);
    if (isAtTop == null) {
      var scrollY = window.scrollY;
      var tolerance = 2;
      isAtTop = scrollY - 2 <= 0;
    }
    if (isAtBottom == null) {
      var documentHeight = document.documentElement.scrollHeight;
      var windowHeight =
        window.innerHeight || document.documentElement.clientHeight;
      var scrollY = window.scrollY;
      var tolerance = 2;
      isAtBottom = scrollY + windowHeight + tolerance >= documentHeight;
    }
    isScrolling = setTimeout(function () {
      if (event.deltaY < 0) {
        console.log("双指上划");
        if (isAtTop) {
          window.parent.postMessage("prevpage", "*");
        }
      } else {
        if (isAtBottom) {
          window.parent.postMessage("nextpage", "*");
        }
      }
      isAtBottom = null;
      isAtTop = null;
    }, 200);
  });
  document.addEventListener("keydown", (e) => {
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
