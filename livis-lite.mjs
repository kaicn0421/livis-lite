#!/usr/bin/env node
// LIVIS Lite — 薄壳：把你的话交给 deepseek-tui 真 agent 执行。
// 特性：网页填 key（deepseek-tui login --api-key）+ 壳维护上下文记忆。
// 启动：node livis-lite.mjs            (默认 auto=真执行)
//      LIVIS_EXEC_MODE=chat node livis-lite.mjs   (纯对话，用于验证、不触发自主执行)
import http from "node:http";
import { spawn, execFile } from "node:child_process";

const PORT = Number(process.env.LIVIS_LITE_PORT || 8799);
const TUI_BIN = process.env.DEEPSEEK_TUI_BIN || "deepseek-tui";
const EXEC_MODE = (process.env.LIVIS_EXEC_MODE || "auto").toLowerCase();
// 补全 PATH：即使从 PATH 不全的环境（双击 / GUI 启动）跑起来，也能找到 deepseek-tui
const RICH_ENV = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.HOME || ""}/.npm-global/bin:${process.env.PATH || ""}` };
const MAX_CTX_TURNS = 6;
const J = { "content-type": "application/json; charset=utf-8" };
const history = []; // {role:"user"|"ai", text}

function buildPrompt(text) {
  if (!history.length) return text;
  const ctx = history.slice(-MAX_CTX_TURNS)
    .map((h) => (h.role === "user" ? "用户" : "助手") + "：" + h.text)
    .join("\n");
  return `[之前的对话，供你理解上下文；已经做过的动作不要重复执行]\n${ctx}\n\n[当前请求]\n${text}`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
  });
}

const PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LIVIS Lite</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:16px;background:#0b0b0c;color:#eaeaea}
h2{font-weight:600;margin-bottom:4px}.muted{color:#888;font-size:12px}
#keybox{margin:8px 0 14px}#keybox summary{cursor:pointer}
.keyrow{display:flex;gap:8px;margin:8px 0}
#log{min-height:300px;padding-bottom:12px}
.turn{margin:10px 0;padding:10px 12px;border-radius:10px;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.you{background:#16304a}.ai{background:#161819}.err{background:#3a1620}
#bar{display:flex;gap:8px;position:sticky;bottom:0;background:#0b0b0c;padding:10px 0}
input{padding:11px;border-radius:8px;border:1px solid #333;background:#111;color:#eee;font-size:15px}
#q{flex:1}#key{flex:1}
button{padding:11px 18px;border-radius:8px;border:0;background:#3b82f6;color:#fff;font-size:15px;cursor:pointer}
button:disabled{opacity:.5}
</style></head>
<body>
<h2>LIVIS Lite</h2>
<div class="muted">真 agent · deepseek-tui · 模式 MODE_TAG</div>
<details id="keybox"><summary class="muted">设置 / 更换 API Key（首次使用先填一次）</summary>
<div class="keyrow"><input id="key" type="password" placeholder="sk-... 你的 DeepSeek API Key"><button id="savekey">保存</button></div>
<div id="keymsg" class="muted"></div></details>
<div id="log"></div>
<div id="bar"><input id="q" placeholder="说你想干什么，比如：打开百度" autofocus><button id="go">发送</button></div>
<script>
const log=document.getElementById('log'),q=document.getElementById('q'),go=document.getElementById('go');
const key=document.getElementById('key'),savekey=document.getElementById('savekey'),keymsg=document.getElementById('keymsg');
function add(cls,txt){const d=document.createElement('div');d.className='turn '+cls;d.textContent=txt;log.appendChild(d);window.scrollTo(0,document.body.scrollHeight);return d}
savekey.onclick=async function(){const k=key.value.trim();if(!k){keymsg.textContent='请输入 key';return}savekey.disabled=true;keymsg.textContent='保存中…';
try{const r=await fetch('/setkey',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})});const j=await r.json();keymsg.textContent=j.ok?'已保存，可以开始用了':('保存失败：'+(j.error||''));if(j.ok)key.value=''}catch(e){keymsg.textContent='出错：'+e.message}savekey.disabled=false};
async function run(){const text=q.value.trim();if(!text)return;q.value='';add('you',text);const a=add('ai','执行中…');go.disabled=true;
try{const r=await fetch('/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});const j=await r.json();a.className='turn '+(j.ok?'ai':'err');a.textContent=(j.ok?'':'[失败] ')+(j.answer||'(无输出)')}catch(e){a.className='turn err';a.textContent='[错误] '+e.message}
go.disabled=false;q.focus()}
go.onclick=run;q.addEventListener('keydown',function(e){if(e.key==='Enter')run()});
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE.replace("MODE_TAG", EXEC_MODE));
    return;
  }
  if (req.method === "POST" && req.url === "/setkey") {
    const body = await readBody(req);
    const k = String(body.key || "").trim();
    if (!k) { res.writeHead(400, J); res.end(JSON.stringify({ ok: false, error: "空 key" })); return; }
    execFile(TUI_BIN, ["login", "--api-key", k], { env: RICH_ENV }, (err, stdout, stderr) => {
      if (res.headersSent) return;
      res.writeHead(200, J);
      res.end(JSON.stringify(err ? { ok: false, error: String(stderr || err.message).slice(0, 300) } : { ok: true }));
    });
    return;
  }
  if (req.method === "POST" && req.url === "/run") {
    const body = await readBody(req);
    const text = String(body.text || "").slice(0, 4000).trim();
    if (!text) { res.writeHead(400, J); res.end(JSON.stringify({ ok: false, answer: "空指令" })); return; }
    const args = ["exec", "--json"];
    if (EXEC_MODE === "auto") args.push("--auto");
    args.push(buildPrompt(text));
    const child = spawn(TUI_BIN, args, { env: RICH_ENV });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => {
      if (res.headersSent) return;
      res.writeHead(200, J);
      res.end(JSON.stringify({ ok: false, answer: "启动 deepseek-tui 失败：" + e.message }));
    });
    child.on("close", (code) => {
      let answer = "";
      try { const j = JSON.parse(out); answer = j.output ?? j.answer ?? j.message ?? out; } catch { answer = out.trim() || err.trim(); }
      answer = String(answer || "(无输出)");
      if (code === 0) { history.push({ role: "user", text }); history.push({ role: "ai", text: answer.slice(0, 600) }); }
      if (res.headersSent) return;
      res.writeHead(200, J);
      res.end(JSON.stringify({ ok: code === 0, answer }));
    });
    return;
  }
  res.writeHead(404); res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[livis-lite] http://127.0.0.1:${PORT}  mode=${EXEC_MODE}  bin=${TUI_BIN}`);
});
