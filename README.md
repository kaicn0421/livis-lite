# LIVIS Lite

把你说的话交给真 AI agent（[deepseek-tui](https://github.com/Hmbown/DeepSeek-TUI)）在你自己电脑上**执行**——打开网站、找资料、做事。不是预设脚本，是真 agent。

## 快速开始（macOS）
1. 双击 **`start.command`**
   - 首次会自动安装内核 `deepseek-tui`（需要先装好 [Node.js](https://nodejs.org)）
2. 浏览器自动打开 → 展开「设置 / 更换 API Key」，填一次你的 **DeepSeek API Key**（在 platform.deepseek.com 申请）
3. 在输入框说你想干什么：
   - `打开百度`
   - `我想听 不染`
   - `帮我在桌面建个文件夹叫 测试`

## 为什么不一样
- **真 agent 执行**：能听懂任意一句话、自己决定怎么干，不靠写死的规则。
- **国内自然适配**：它自己会优先网易云 / B站 等国内平台，不会把你塞进打不开的 YouTube。
- **填一个 key 就用**：key 存在你本机（deepseek-tui 的配置里），不上传。
- **记上下文**：能接着上一句继续（“换一个”“刚才那个”）。

## 手动启动（开发 / 调试）
```bash
npm i -g deepseek-tui                  # 装内核
deepseek-tui login --api-key sk-...    # 或在网页里填
node livis-lite.mjs                    # 起服务，浏览器开 http://127.0.0.1:8799/
# 验证用纯对话模式（不触发自主执行）：
LIVIS_EXEC_MODE=chat node livis-lite.mjs
```

## 说明
- 真 agent 会在你电脑上执行命令、打开应用。它由 deepseek-tui 的 `--auto`（自主执行）驱动——等于授权它自己动手，**请在你信任的环境使用**。
- 本仓库**不含任何 API key**；key 只存在使用者本机。

---
LIVIS Lite v0.1 · 薄壳 + 真 agent
