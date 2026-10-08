# HeteroCam Lab

浏览器里的异构摄像集群仿真（Vite + React + Three.js）。无需 Python、无需服务器，换电脑只要有 Node.js 就能打开。

## 换电脑打开

1. 安装 [Node.js 20+](https://nodejs.org/)（建议 LTS）。
2. 把整个 `project` 文件夹拷过去，或从 Git 克隆。**不要拷** `node_modules`、`.venv-ppt`。
3. 在工程目录执行：

```bash
npm install
npm run dev
```

4. 浏览器打开 http://localhost:5173 。

选中机位后：`WASD` 机动、方向键云台、`ZX` 变焦；可切换手动 / 跟踪 / 巡航，并导出针孔相机内外参 JSON。顶部可切换平衡木 / 十一人制足球。足球场地内禁止机位进入。

设计说明：[docs/heterocam-lab-technical.md](docs/heterocam-lab-technical.md)。汇报稿：[output/final_presentation_cn.pptx](output/final_presentation_cn.pptx)。

## GitHub 在线演示

本仓库已配置 GitHub Pages 工作流。推送到 GitHub 的 `main` 分支后，在仓库 **Settings → Pages → Source** 选 **GitHub Actions**。演示地址为：

`https://<你的GitHub用户名>.github.io/<仓库名>/`

本地预览打包结果：

```bash
npm run build
npm run preview
```
