function addStyle() {
  var styleTag = document.createElement("style");
  styleTag.textContent = `
img {
    max-width: 100%;
}    
.qgmark{
    background-color: #ffcc00;
}
#customContextMenu {
    display: none;
    position: absolute;
    background-color: #f1f1f1;
    border: 1px solid #d4d4d4;
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  #customContextMenu a {
    color: black;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
  }

  #customContextMenu a:hover {
    background-color: #ddd;
  }
  `;
  document.head.appendChild(styleTag);
}
function hideContextMenu() {
  var customContextMenu = document.getElementById("customContextMenu");
  customContextMenu.style.display = "none";
  document.removeEventListener("click", hideContextMenu);
}

async function call(name, ...params) {
  return await new Promise((r) => {
    function handleCallResponse(event) {
      if (event.data.type == "call result") {
        if (event.data.name == name) {
          window.removeEventListener("message", handleCallResponse);
          r(event.data.result);
        }
      }
    }
    window.addEventListener("message", handleCallResponse);
    window.parent.postMessage({ name, params, type: "call" }, "*");
  });
}

async function doRemovePizhu() {
  const text = window.getSelection().toString();
  if (!text || text.length > 10) {
    console.log("不能注音");
    return;
  }
  var range = getSelection().getRangeAt(0);
  var selectedHtml = range.cloneContents();
  const div = document.createElement("div");
  div.appendChild(selectedHtml);
  const words = div.querySelectorAll(".pz");
  for (let word of [...words]) {
    word.parentNode.removeChild(word);
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(div.innerText));
  await save();
}

async function doRemovePinyin() {
  const text = window.getSelection().toString();
  if (!text || text.length > 10) {
    console.log("不能注音");
    return;
  }
  var range = getSelection().getRangeAt(0);
  var selectedHtml = range.cloneContents();
  const div = document.createElement("div");
  div.appendChild(selectedHtml);
  const words = div.querySelectorAll("ruby");
  for (let word of [...words]) {
    const pinyin = word.querySelector("rt");
    if (pinyin) {
      word.removeChild(pinyin);
    }
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(div.innerText));
  await save();
}

async function doPizhu() {
  const text = window.getSelection().toString();
  if (!text || text.length > 10) {
    console.log("不能注音");
    return;
  }
  const result = await call("prompt", "你想说点什么？");
  console.log("call prompt return", result);
  if (result) {
    var replacementHTML = `<span class="qgmark">${text}</span><span class="pz"><img class="pi" src="../Images/pp.jpg">${result}</span>`;
    const newnode = document.createElement("span");
    newnode.innerHTML = replacementHTML;
    var range = getSelection().getRangeAt(0);
    range.deleteContents();
    range.insertNode(newnode);
    await save();
  }
}

async function doPinyin() {
  const text = window.getSelection().toString();
  if (!text || text.length > 10) {
    console.log("不能注音");
    return;
  }
  const result = await call("pinyin", text);
  if (result.length == text.length) {
    var replacementHTML = text
      .split("")
      .map((char, idx) => `<ruby>${char}<rt>${result[idx][0]}</rt></ruby>`)
      .join("");
    const newnode = document.createElement("span");
    newnode.innerHTML = replacementHTML;
    var range = getSelection().getRangeAt(0);
    range.deleteContents();
    range.insertNode(newnode);
    await save();
  }
}

async function save() {
  const div = document.createElement("div");
  div.innerHTML = document.body.innerHTML;
  const cmenu = div.querySelector("#customContextMenu");
  div.removeChild(cmenu);
  await call("save", {
    path: location.pathname,
    html: div.innerHTML,
  });
}

async function handleMenuClick(e, item) {
  e.preventDefault();
  hideContextMenu();
  if (item.textContent == "注音") {
    await doPinyin();
  } else if (item.textContent == "移除注音") {
    await doRemovePinyin();
  } else if (item.textContent == "添加批注") {
    await doPizhu();
  } else if (item.textContent == "移除批注") {
    await doRemovePizhu();
  }
}
function addContextMenu() {
  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    var customContextMenu = document.getElementById("customContextMenu");
    customContextMenu.style.left = event.clientX + window.scrollX + "px";
    customContextMenu.style.top = event.clientY + window.scrollY + "px";
    customContextMenu.style.display = "block";
    document.addEventListener("click", hideContextMenu);
  });
  const div = document.createElement("div");
  div.id = "customContextMenu";
  div.innerHTML = `<a href="#">注音</a>
  <a href="#">添加批注</a>
  <a href="#">移除注音</a>
  <a href="#">移除批注</a>`;
  for (let item of [...div.querySelectorAll("a")]) {
    item.onclick = (e) => handleMenuClick(e, item);
  }
  document.body.appendChild(div);
}
function addTurnPageByWheel() {
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
}
function addTurnPageByKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key == "ArrowRight") {
      window.parent.postMessage("nextpage", "*");
    } else if (e.key == "ArrowLeft") {
      window.parent.postMessage("prevpage", "*");
    }
  });
}
function plugin() {
  addStyle();
  addContextMenu();
  addTurnPageByWheel();
  addTurnPageByKeyboard();
  console.log("plugin injected!");
}
window.onload = function () {
  plugin();
};
