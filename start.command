#!/bin/bash
# LIVIS Lite — 一键启动 (macOS)。双击本文件即可。
cd "$(dirname "$0")"
echo "=== LIVIS Lite 启动 ==="

if ! command -v node >/dev/null 2>&1; then
  echo "缺少 Node.js。请先到 https://nodejs.org 下载安装，再双击本文件。"
  read -p "按回车键关闭…"; exit 1
fi

if ! command -v deepseek-tui >/dev/null 2>&1; then
  echo "首次使用，正在安装真 agent 内核 deepseek-tui …"
  npm i -g deepseek-tui || {
    echo "自动安装失败。请在终端手动运行： npm i -g deepseek-tui"
    read -p "按回车键关闭…"; exit 1
  }
fi

echo "启动中…浏览器会自动打开。首次请在网页里『设置 API Key』填一次你的 DeepSeek key。"
node livis-lite.mjs &
SRV=$!
sleep 2
open "http://127.0.0.1:8799/"
echo "（要停止：直接关掉这个终端窗口）"
wait $SRV
