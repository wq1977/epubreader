import { shell } from "electron";
const level = require("classic-level");

let db,
  booksRoot,
  books = {};

async function serveReaderScript(ctx, next) {
  const path = ctx.request.url;
  if (path.endsWith("/reader.js")) {
    ctx.body = require("fs")
      .readFileSync(require("path").join(__dirname, "reader.js"))
      .toString();
  } else {
    await next();
  }
}

async function serveXHTML(ctx, next) {
  const path = ctx.request.url;
  let latestVersion = "";
  if (path.endsWith(".xhtml")) {
    let html = require("fs").readFileSync(`${booksRoot}${path}`).toString();
    try {
      latestVersion = await db.get(`/pages/${path}`);
    } catch (err) {}
    if (latestVersion) {
      //将body以内的部分换成新版本。
      const bodyRegex = /<body(\s+[^>]*)?>[\s\S]*?<\/body>/i;
      const match = bodyRegex.exec(html);
      if (match) {
        const bodyAttributes = match[1] || "";
        html = html.replace(
          bodyRegex,
          `<body${bodyAttributes}>${latestVersion}</body>`
        );
      }
    }
    //给html添加特定的script header
    html = html.replace(
      "</head>",
      `<script src="/reader.js"></script>\n</header>`
    );
    ctx.body = html;
  } else {
    await next();
  }
}

const api = {
  versions() {
    return process.versions;
  },
  init(root) {
    db = new level.ClassicLevel(require("path").join(root, "level"), {
      valueEncoding: "json",
    });
    booksRoot = require("path").join(root, "books");
    if (!require("fs").existsSync(booksRoot)) {
      require("fs").mkdirSync(booksRoot);
    }
    const Koa = require("koa");
    const serve = require("koa-static");
    const cors = require("koa2-cors");
    const app = new Koa();
    app.use(
      cors({
        origin: function (ctx) {
          return ctx.header.origin;
        }, // 允许发来请求的域名
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 设置所允许的 HTTP请求方法
        credentials: true,
      })
    );
    app.use(serveReaderScript);
    app.use(serveXHTML);
    app.use(serve(booksRoot));
    app.listen(process.env.PORT || 8989, "0.0.0.0");
  },
  async lookup(prefix) {
    const iterator = db.iterator();
    const result = [];
    try {
      let entry;
      await iterator.seek(prefix);
      while ((entry = await iterator.next())) {
        let [key, value] = entry;
        key = key.toString();
        if (!key.startsWith(prefix)) break;
        result.push({ key, value });
      }
      return result;
    } catch (err) {
      log.error(err, "seek error");
    }
  },
  async load() {
    const books = await api.lookup("/books/");
    return books.map((book) => ({
      ...book.value,
      id: book.key.substr(7),
    }));
  },
  async setConfig(event, book, config) {
    await db.put(`/book/config/${book}`, config);
  },
  async config(event, data) {
    try {
      const result = await db.get(`/book/config/${data.book}`);
      return result;
    } catch (err) {
      return {
        fontsize: 4,
        margin: 1,
      };
    }
  },
  async recovery(event, data) {
    const { params } = data;
    const { path } = params[0];
    await db.del(`/pages/${path}`);
  },
  async save(event, data) {
    const { params } = data;
    const { html, path } = params[0];
    await db.put(`/pages/${path}`, html);
  },
  async search(event, data) {
    const { params } = data;
    const text = params[0];
    shell.openExternal(
      `https://zh.wiktionary.org/wiki/${encodeURIComponent(text)}`
    );
  },
  pinyin(event, data) {
    const { pinyin } = require("pinyin");
    const { params } = data;
    const [text] = params;
    return pinyin(text);
  },
  async loadBook(event, id) {
    const targetPath = require("path").join(booksRoot, `${id}.epub`);
    const EPub = require("epub");
    const epub = await new Promise((r) => {
      const epub = new EPub(targetPath);
      epub.on("end", function () {
        r(epub);
      });
      epub.parse();
    });
    return epub;
  },
  async addBook(event, book) {
    const id = require("crypto")
      .createHash("md5")
      .update(require("fs").readFileSync(book.path))
      .digest("hex");
    const targetPath = require("path").join(booksRoot, id);
    if (!require("fs").existsSync(targetPath)) {
      require("fs").mkdirSync(targetPath);
      const StreamZip = require("node-stream-zip");
      const zip = new StreamZip.async({ file: book.path });
      await zip.extract(null, targetPath);
      await zip.close();
    }
    const entry = require("path").join(targetPath, "META-INF", "container.xml");
    if (!require("fs").existsSync(entry)) throw new Error("invalid epub");
    var parser = require("xml2json");
    var json = JSON.parse(
      parser.toJson(require("fs").readFileSync(entry).toString())
    );
    const rootfile = json.container.rootfiles.rootfile["full-path"];
    const opfPath = require("path").join(targetPath, rootfile);
    if (!require("fs").existsSync(opfPath)) throw new Error("invalid opf Path");
    json = JSON.parse(
      parser.toJson(require("fs").readFileSync(opfPath).toString())
    );
    const title = json.package.metadata["dc:title"] || "";
    const publisher = json.package.metadata["dc:publisher"] || "";
    const coverMeta = (json.package.metadata.meta || []).filter(
      (item) => item.name == "cover"
    );
    let cover = "";
    if (coverMeta.length) {
      cover = coverMeta[0].content;
    }
    const result = {
      id,
      title,
      publisher,
      cover,
      manifest: json.package.manifest.item.reduce((r, i) => {
        r[i.id] = i;
        return r;
      }, {}),
      flow: json.package.spine.itemref.map((item) => item.idref),
    };
    const tockey = json.package.spine.toc;
    if (tockey) {
      const href = result.manifest[tockey].href;
      const tocPath = require("path").join(
        require("path").dirname(opfPath),
        href
      );
      if (require("fs").existsSync(tocPath)) {
        const tocJson = JSON.parse(
          parser.toJson(require("fs").readFileSync(tocPath).toString())
        );
        function parseToc(node) {
          const result = [];
          for (let point of node.navPoint || []) {
            const node = {
              id: point.id,
              order: point.playOrder,
              title: point.navLabel.text,
              href: point.content.src,
            };
            if (point.navPoint) {
              node.children = parseToc(point);
            }
            result.push(node);
          }
          return result;
        }
        const toc = parseToc(tocJson.ncx.navMap);
        result.toc = toc;
      }
    }
    await db.put(`/books/${id}`, result);
    return result;
  },
};

export default api;
