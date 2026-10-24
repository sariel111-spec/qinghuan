# 一枕清欢

古风清新的个人梦向创作与存档网站。仓库保留当前完整页面与功能：双人档案、故事时间线、灵感标签、画稿原图、传讯记录、待问整理、AI 灵感助手、选择性备份/导入、Word/PDF 成卷和原图下载。

## 为什么不能只用 GitHub Pages

本项目包含数据库、原图上传和服务端接口，不是纯静态网页。GitHub 负责安全保存源码、记录版本和触发自动部署；完整网站部署到 Cloudflare Workers，并使用：

- `DB`（Cloudflare D1）：保存档案、故事、标签、时间线等文字数据。
- `ARCHIVE`（Cloudflare R2）：保存画稿、聊天截图与其他上传原图。
- `app/api/`：提供新增、修改、删除、上传和下载接口。

直接发布到 GitHub Pages 会失去上述功能，因此本仓库附带 Cloudflare 部署流程。

## 仓库内不包含什么

这是一份干净源码，不包含你在线上填写的私人文字、聊天截图、画稿或数据库内容。迁移现有数据时：

1. 在原网站打开右侧“藏卷”。
2. 选择全部页面并下载备份。
3. 部署新网站。
4. 在新网站“藏卷 → 导入”中恢复备份。

备份文件会包含图片，因此不要把它提交到公开 GitHub 仓库。

## 上传到 GitHub

1. 在 GitHub 新建一个空仓库，建议设为 **Private**。
2. 解压本项目，把本目录内的全部文件上传到仓库根目录。
3. GitHub 会自动运行 `Build check`，确认页面可以正常构建。

也可以使用 Git：

```bash
git init
git add .
git commit -m "Initial website"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

检查正式构建：

```bash
npm run build
```

## 第一次准备 Cloudflare

安装并登录 Wrangler：

```bash
npx wrangler login
```

创建数据库与原图存储桶：

```bash
npx wrangler d1 create yizhen-qinghuan-db
npx wrangler r2 bucket create yizhen-qinghuan-archive
```

请保存第一条命令返回的 `database_id`。

随后在 GitHub 仓库打开 `Settings → Secrets and variables → Actions`，建立以下 **Repository secrets**：

| 名称 | 内容 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 具有 Workers、D1、R2 部署权限的 Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | 创建 D1 后返回的 database_id |
| `CLOUDFLARE_D1_DATABASE_NAME` | `yizhen-qinghuan-db` |
| `CLOUDFLARE_R2_BUCKET_NAME` | `yizhen-qinghuan-archive` |

可选建立一个 **Repository variable**：

| 名称 | 内容 |
| --- | --- |
| `CLOUDFLARE_WORKER_NAME` | 自定义网站 Worker 名；不填时使用 `yizhen-qinghuan` |

## 从 GitHub 部署

1. 打开仓库的 `Actions`。
2. 选择 `Deploy to Cloudflare`。
3. 点击 `Run workflow`。

流程会自动完成：安装依赖、构建网站、创建数据库表、绑定 D1/R2 并部署。部署配置由 GitHub Secrets 临时生成，不会把账户 ID、数据库 ID 或令牌提交到仓库。

## 后续更新

修改源码并推送后，`Build check` 会自动检查。确认通过后，再到 Actions 手动运行 `Deploy to Cloudflare`，即可更新正式网站。

## 隐私与安全

- 建议使用 GitHub 私人仓库。
- 不要提交 `.env`、`.wrangler-deploy.json`、备份 JSON、聊天截图或私人画稿。
- `.gitignore` 已排除依赖、构建目录、本地 Cloudflare 状态和临时部署配置。
- 如果需要限制网站访问，可在 Cloudflare Zero Trust 中为 Worker 域名配置 Access 登录策略。
