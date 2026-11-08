# 宿主调教系统 · 插件 C0（Tauri Tavern 测试包）

把本目录三个文件放到一个公开 GitHub 仓库根目录：

- `manifest.json`
- `index.js`（已内联 lib，安装器只取单文件也能跑）
- `styles.css`

然后在 Tauri Tavern 的扩展安装入口填仓库地址；
如果安装器要求清单地址，填
`https://raw.githubusercontent.com/<用户>/<仓库>/main/manifest.json`。

这是 UI/存档原型，不自动接管 MVU，不写入卡内 `stat_data`；
真实宿主的事件、`generateRaw`/`generateQuietPrompt`、localStorage 与移动端仍要实测。
