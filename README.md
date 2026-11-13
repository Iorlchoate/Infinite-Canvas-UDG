# 无限画布 · Infinite Canvas

基于开源项目 [Infinite-Canvas](https://github.com/hero8152/Infinite-Canvas) 二次开发的本地 AI 创作画布工具。

- 项目主页：<https://github.com/Iorlchoate/Infinite-Canvas-UDG>
- **下载安装**：见下方 [⬇️ 下载与安装](#️-下载与安装)（免安装绿色包，解压即用）

---

## ⬇️ 下载与安装

**新用户请直接下载打包好的绿色包**，无需克隆仓库、无需安装 Python：

1. 打开 [Releases 页面](https://github.com/Iorlchoate/Infinite-Canvas-UDG/releases/latest)，下载最新的 `Infinite-Canvas-UDG-<版本>-win.zip`（约 50 MB）
2. **解压到任意目录**（建议路径不要带中文空格以外的特殊字符，例如 `D:\AI\Infinite-Canvas-UDG`）
3. **双击 `start.bat`**，等待控制台自动打开浏览器（默认 <http://127.0.0.1:3000/>）
4. 首次使用进入 **「API 设置」**，填入可用的 API Key 保存后即可生图

> **绿色包特点**：内置便携 Python 与全部离线依赖 —— 免安装、断网可启动、端口被占用自动顺延；解压后请勿删除 `python/` 与 `packages/` 目录。

<details>
<summary><b>没有 Release 包时的替代方式（克隆源码运行）</b></summary>

```bash
git clone https://github.com/Iorlchoate/Infinite-Canvas-UDG.git
cd Infinite-Canvas-UDG
start.bat          # Windows（自带 python/ 便携运行时，同样免安装）
python3 main.py    # macOS / Linux（需先 pip3 install -r requirements.txt）
```

</details>


## 项目简介

无限画布是一款本地运行的 AI 创作画布工具，以 Python + FastAPI 为后端、原生前端为界面，支持调用各类 OpenAI 协议 API、ModelScope 免费模型等，把生成、编辑、整理、沉淀整合到一张无限画布上。

## 界面预览

四个模块共用同一套侧栏：**自定义工作流 → 在线生图 → 无限画布 → 素材库**，生成、编辑、整理、沉淀串成一条流。

> 以下为界面功能展示截图。

<p align="center">
  <b>自定义工作流</b> · 四个内置模板可改标题、画幅、节点与提示词，支持关键词批量替换与另存
  <br />
  <img width="900" alt="自定义工作流界面" src="docs/screenshots/custom-workflow.png" />
</p>

<p align="center">
  <b>在线生图</b> · 参考图 1-9 张自定义，每张带 IMAGE 编号，写 Prompt 时直接指代
  <br />
  <img width="900" alt="在线生图界面" src="docs/screenshots/online-studio.png" />
</p>

<p align="center">
  <b>无限画布</b> · 节点自由摆放、连线组合，文生图 / 图生图 / 局部重绘 / 扩展出图 / 九宫格多视角
  <br />
  <img width="900" alt="无限画布界面" src="docs/screenshots/canvas-overview.png" />
</p>

<p align="center">
  <b>素材库</b> · 分组管理、批量整理、智能分类，也可推送到在线平台
  <br />
  <img width="900" alt="素材库界面" src="docs/screenshots/asset-library.png" />
</p>

## 功能特性

1. 自定义工作流：四个内置模板可自行定制（标题、说明、画幅、节点名称、提示词），支持关键词批量替换、模板另存与还原
2. 无限画布：节点式创作流，支持文生图 / 图生图 / 局部重绘 / 扩展出图 / 九宫格多视角等
3. 在线生图：直连云端 API 生成，参考图片支持 1-9 张自定义并带 IMAGE 编号，写 Prompt 时可直接指代
4. 素材库：本地素材分组管理，支持 Chrome 批量采集插件、Photoshop 直连插件（tools 目录）
5. API 设置：管理各平台地址、模型列表与 Key（Key 写入后端 env，页面不回显）
6. 一键更新：从 GitHub 仓库自动下载新版本（更新前自动备份，可回滚）
7. 支持几乎所有 OpenAI 协议的 API / 异步协议 / Gemini 协议 / 方钩协议
8. 支持 ModelScope 免费 LLM 与图像模型调用

## 快速开始

> 提示：普通用户走上方 [⬇️ 下载与安装](#️-下载与安装) 的 Release 绿色包最快；以下为源码/拷贝方式的详细说明。

### 部署到一台新电脑（Windows）

整个文件夹（含 `python/` 便携运行时与 `packages/` 离线依赖包）**整体拷贝**到新电脑任意目录（或直接解压 Release 的 zip），双击 `start.bat` 即可使用：

- **无需安装 Python**：优先使用项目自带的 `python/` 便携运行时
- **无需联网**：依赖已随项目打包；即使依赖丢失，`start.bat` 会自动调用 `install-deps.bat` 从 `packages/` 离线修复
- **端口自动避让**：3000 被占用时自动顺延到 3001、3002……，控制台会显示实际访问地址，浏览器自动打开对应页面
- **双击 `run.bat` 效果相同**（兼容入口，内部转发到 `start.bat`）

```bat
start.bat
```

启动后按控制台提示访问（默认 <http://127.0.0.1:3000/>，被占用时顺延）。

### macOS / Linux

```bash
python3 main.py
```

或使用 `mac-启动服务.sh`。

> macOS 首次运行如遇权限提示，请先执行 `mac-修复权限.command`。

首次使用请进入「API 设置」配置可用的 API 平台与 Key，保存后即可在画布上调用 OpenAI 协议、ModelScope、火山引擎、即梦等平台的图像与对话能力。

## 手机 / 平板访问

程序默认监听 `0.0.0.0`，**同一个 Wi-Fi 下的手机、平板用浏览器就能打开**，无需安装任何 App：

1. 电脑上双击 `start.bat`，控制台除了本机地址，还会打印一行
   `Same Wi-Fi (phone/tablet): http://192.168.x.x:3000/`
2. iPad / iPhone 用 **Safari** 打开该地址；Android 用 **Chrome** 打开
3. 浏览器菜单里选择「添加到主屏幕 / 安装应用」，即可全屏运行（已内置 Web App 清单、图标与深色状态栏）

**边界说明**：

- 数据、素材与 API Key 都存在这台电脑上，电脑关机或退出程序后手机 / 平板无法访问；跨网络访问需自建端口映射或内网穿透，请自行评估安全风险
- 触屏已内置桥接：单指拖动平移画布 / 拖节点、双指捏合缩放、点按与双击都可用；画布类页面在横屏（约 1024px 以上）体验最佳，竖屏空间较紧
- 安卓端如需**完全离线（不依赖电脑）**，可在 Termux 里运行 `python main.py`（需自行安装依赖），原生 APK 需重写渲染层，暂不支持

## 配套工具

- `tools/chrome-local-asset-importer`：Chrome 插件，扫描网页图片批量导入素材库
- `tools/photoshop-asset-connector`：Photoshop UXP 面板插件，PS 与素材库双向打通
- `tools/make_release_zip.py`：发布打包脚本，生成给用户下载的免安装 zip（见下）
- `tools/make_release_dir.py`：生成「纯净可分发目录」，供文件夹形式分发（内网共享 / 移动硬盘 / 网盘）
- `tools/publish_guard.py`：发布安全规则，打包与目录分发共用同一套判定

### 发布打包（维护者）

```bash
python tools/make_release_zip.py
# 输出 dist/Infinite-Canvas-UDG-<版本>-win.zip（约 50 MB，只收录 git 跟踪文件，
# 自动排除 .git、API/.env 密钥、素材与画布运行数据）

python tools/make_release_dir.py
# 输出 dist/Infinite-Canvas-UDG-<版本>-publish/，内容与 zip 一致，可直接整体拷贝分发
# 目标可自定义（含 UNC 内网路径）：--output "\\服务器\共享\Infinite-Canvas-UDG-..."

python tools/make_release_dir.py --check "D:\待发布目录"
# 发布前复查任意目录；发现敏感项会以非零退出码报错
```

> **不要直接复制正在运行的工作目录对外发布。** 运行目录会不断产生 `API/.env`（密钥）、`history.json`（生成历史）、`assets/` 用户素材、`data/` 画布与配置、`output/`、`logs/` 等数据。打包脚本与目录生成脚本都会通过 `publish_guard.py` 做硬校验，发现这些内容直接失败，不会静默放过去。需要分发时只用上面两个命令产出的 zip / `-publish` 目录。

把 zip 上传到 [Releases](https://github.com/Iorlchoate/Infinite-Canvas-UDG/releases)（`gh release create <版本号> dist/*.zip`）即可供用户在 README 顶部入口下载；上传前用 `gh release view` 或网页检查附件名称与 README 中的说明一致。

## 开源与致谢

本项目基于 **wuli大雄** 的开源项目 [Infinite-Canvas](https://github.com/hero8152/Infinite-Canvas) 二次开发而成。

**特别致谢**：感谢原创作者 **wuli大雄** 开发并开源了 Infinite-Canvas，为本项目提供了全部基础代码。原项目已申请著作权，其开源约定（二次开发须保持开源并注明来源作者、禁止擅自商用封装）对上游代码继续适用，本项目同样保持开源并注明来源。

本项目在此基础上聚焦画布体验，项目主页与在线更新均指向本仓库。

### 上游项目

基于 [Infinite-Canvas](https://github.com/hero8152/Infinite-Canvas)（原作者 **wuli大雄**）二次开发；上游已于 2026/08/28 停更，与本项目无隶属关系。

- 作者主页：[B 站](https://space.bilibili.com/78652351) · 新版：[DX-OS](http://www.DX-OS.com)
- 视频教程：[YouTube](https://youtu.be/1y9ShTvgC_w) · Chrome 采集插件：[安装](https://chromewebstore.google.com/detail/infinite-canvas-%E5%9B%BE%E5%83%8F%E8%A7%86%E9%A2%91%E6%96%87%E5%AD%97%E6%8A%93%E5%8F%96%E5%B7%A5/ajfhnbklbmpfaaookhfakohabnpmlcic)

## 目录结构

```
main.py                 # FastAPI 后端入口
static/                 # 前端页面（画布 / 素材库 / 设置等）
static/js/              # 前端脚本
static/images/          # 图片资源
data/                   # 运行数据（画布、素材库、配置）
tools/                  # Chrome 采集插件 / Photoshop 直连插件 / 端口探测脚本
packages/               # 离线依赖包（与自带 Python 版本匹配的 wheel）
python/                 # Windows 便携 Python 运行时（含已装依赖）
start.bat               # Windows 启动入口（依赖自检 + 端口避让）
install-deps.bat        # 依赖安装脚本（优先离线，支持无网环境）
run.bat                 # 兼容启动入口（转发到 start.bat）
```

## 常见问题

- **端口被占用**：无需手动处理——启动时自动检测，3000 被占用会顺延到 3001/3002……，以控制台输出的地址为准。如需固定端口，可设置环境变量 `CANVAS_PORT`（如 `set CANVAS_PORT=8080` 后再运行 `start.bat`）。
- **提示缺少依赖 / ModuleNotFoundError**：`start.bat` 会自动从 `packages/` 离线补装；也可手动运行 `install-deps.bat`。请勿删除 `packages/` 与 `python/` 目录。
- **更新失败**：请先在本页「一键更新 → 测试连通性」检查 GitHub 各节点；国内网络请配置系统代理。
- **想关闭更新提示**：删除根目录的 `VERSION` 文件即可。
