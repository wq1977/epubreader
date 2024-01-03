function addStyle() {
  var styleTag = document.createElement("style");
  styleTag.textContent = `
img {
    max-width: 100%;
}    
.qgmark{
  text-decoration: underline;
  text-decoration-color: #AAA;
}
html {
  background-color: #1a1a1a;
  color: #ffffffE0;
}
p.poetry{
  color: #ffff00C0 !important;
}

p.poem{
  color: #ffff00C0 !important;
}

.qgmark > .pz {
}
p{
    line-height:200% !important;
}
ruby > rt{
    font-size: 70%  !important;
}
#customContextMenu {
    display: none;
    position: absolute;
    border: 1px solid #d4d4d4;
    font-size: 12px;
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  span.pz {
    color: #FFFFFF80 !important;
  }

  #customContextMenu a {
    padding: 8px 16px;
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
  if (!text) {
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
  if (!text) {
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
  for (let node of [...div.childNodes].reverse()) {
    range.insertNode(node);
  }

  await save();
}

async function doPizhu() {
  const text = window.getSelection().toString();
  if (!text) {
    console.log("不能注音");
    return;
  }
  const result = await call("prompt", "你想说点什么？");
  if (result) {
    var range = getSelection().getRangeAt(0);
    var selectedHtml = range.cloneContents();
    const div = document.createElement("div");
    div.appendChild(selectedHtml);
    var replacementHTML = `<span class="qgmark">${div.innerHTML}<span class="pz"><img class="pi" src="../Images/pp.jpg">${result}</span></span>`;
    const newnode = document.createElement("span");
    newnode.innerHTML = replacementHTML;
    var range = getSelection().getRangeAt(0);
    range.deleteContents();
    range.insertNode(newnode);
    await save();
  }
}

async function doEdit() {
  var range = getSelection().getRangeAt(0);
  let node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }
  if (node.nodeName == "RT" || node.classList.contains("pz")) {
    const newString = await await call(
      "prompt",
      "你想说点什么？",
      node.innerText
    );
    if (newString) {
      node.innerText = newString;
    }
  }
}

async function doSearch() {
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
  const text = div.innerText.trim();
  if (!text || text.length > 10) {
    console.log("不能注音");
    return;
  }
  await call("search", text);
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
  } else if (item.textContent == "搜索") {
    await doSearch();
  } else if (item.textContent == "恢复页面") {
    await call("recovery", {
      path: location.pathname,
    });
    location.reload();
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
  <a href="#">搜索</a>
  <a href="#">恢复页面</a>
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
    isScrolling = setTimeout(function () {
      call("progress", window.scrollY / document.documentElement.scrollHeight);
    }, 200);
  });
}
function addTurnPageByKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key == "ArrowRight" && e.metaKey) {
      window.parent.postMessage("nextpage", "*");
    } else if (e.key == "ArrowLeft" && e.metaKey) {
      window.parent.postMessage("prevpage", "*");
    }
  });
}

function addCommandHandler() {
  function handleCommand(event) {
    if (event.data.name == "config") {
      const config = event.data;
      updateConfig(config);
    } else if (event.data.name == "setProgress") {
      const progress = event.data.progress;
      window.scrollTo({
        top: document.documentElement.scrollHeight * progress,
        behavior: "smooth",
      });
    }
  }
  window.addEventListener("message", handleCommand);
}

function updateConfig(config) {
  document.documentElement.style.fontSize = `${config.fontsize * 4}px`;
  document.body.style.marginLeft = `${config.margin}vw`;
  document.body.style.marginRight = `${config.margin}vw`;
  console.log("config updated", config);
}

async function initConfig() {
  const config = await call("config");
  updateConfig(config);
}

function addClickEdit() {
  document.addEventListener("click", function (event) {
    if (event.metaKey) {
      doEdit(event);
    }
  });
}

function showAfterLoad() {
  document.fonts.ready.then(() => {
    setTimeout(() => {
      document.body.style.display = "block";
    }, 1000);
  });
}

function plugin() {
  addStyle();
  addContextMenu();
  addTurnPageByWheel();
  addTurnPageByKeyboard();
  addCommandHandler();
  initConfig();
  addClickEdit();
  showAfterLoad();
  console.log("plugin injected!");
}
window.onload = function () {
  plugin();
};
