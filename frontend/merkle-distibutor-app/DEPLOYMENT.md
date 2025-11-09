# Vercel 部署指南

本指南将帮助您将 Merkle Distributor 前端应用部署到 Vercel。

## 前置要求

1. **GitHub 账户**：将代码推送到 GitHub 仓库
2. **Vercel 账户**：如果没有，可以在 [vercel.com](https://vercel.com) 免费注册
3. **Node.js 18+**：确保本地可以正常构建项目

## 部署步骤

### 方法一：通过 Vercel Dashboard（推荐）

#### 1. 准备代码仓库

确保你的代码已经推送到 GitHub：

```bash
cd frontend/merkle-distibutor-app

# 如果还没有初始化 git
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub（替换为你的仓库地址）
git remote add origin https://github.com/your-username/merkle-distributor-frontend.git
git push -u origin main
```

#### 2. 在 Vercel 中导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 选择你的 GitHub 仓库
5. 如果这是第一次连接，需要授权 Vercel 访问你的 GitHub

#### 3. 配置项目设置

在项目配置页面：

- **Framework Preset**: 选择 **Next.js**（Vercel 会自动检测）
- **Root Directory**: 设置为 `frontend/merkle-distibutor-app`（如果你的仓库根目录不是前端项目）
- **Build Command**: `npm run build`（默认，通常不需要修改）
- **Output Directory**: `.next`（默认，通常不需要修改）
- **Install Command**: `npm install`（默认，通常不需要修改）

#### 4. 环境变量（可选）

如果你的项目需要环境变量，可以在 **Environment Variables** 部分添加：

- 目前项目使用硬编码的配置（在 `src/lib/config.ts` 中），所以不需要环境变量
- 如果将来需要，可以添加：
  - `NEXT_PUBLIC_CLUSTER_URL`: Solana 集群 URL
  - `NEXT_PUBLIC_PROGRAM_ID`: 程序 ID

#### 5. 部署

1. 点击 **"Deploy"** 按钮
2. 等待构建完成（通常需要 1-3 分钟）
3. 部署成功后，你会获得一个 URL，例如：`https://merkle-distributor-app.vercel.app`

### 方法二：通过 Vercel CLI

#### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署

```bash
cd frontend/merkle-distibutor-app
vercel
```

按照提示操作：
- 选择项目范围（个人或团队）
- 确认项目设置
- 选择是否链接到现有项目

#### 4. 生产环境部署

```bash
vercel --prod
```

## 自动部署

一旦项目连接到 Vercel，每次推送到 GitHub 的 `main` 分支都会自动触发部署：

- **Preview Deployments**: 每个 Pull Request 都会创建一个预览部署
- **Production Deployments**: 推送到 `main` 分支会触发生产部署

## 自定义域名

1. 在 Vercel Dashboard 中进入项目设置
2. 点击 **"Domains"** 标签
3. 添加你的自定义域名
4. 按照提示配置 DNS 记录

## 构建配置

项目已经配置好，Vercel 会自动：

- 检测 Next.js 框架
- 运行 `npm install` 安装依赖
- 运行 `npm run build` 构建项目
- 部署构建产物

## 故障排除

### 构建失败

如果构建失败，检查：

1. **Node.js 版本**：确保使用 Node.js 18+
   - 在 Vercel 项目设置中，可以指定 Node.js 版本

2. **依赖安装问题**：
   - 检查 `package.json` 中的依赖是否正确
   - 确保所有依赖都是公开可用的

3. **构建错误**：
   - 查看 Vercel 构建日志
   - 在本地运行 `npm run build` 检查是否有错误

### 运行时错误

1. **检查浏览器控制台**：查看是否有 JavaScript 错误
2. **检查网络请求**：确保 Solana RPC 端点可访问
3. **检查钱包连接**：确保钱包适配器正确配置

## 性能优化

### 1. 启用 Edge Functions（可选）

如果需要，可以在 `next.config.ts` 中配置 Edge Functions。

### 2. 优化图片

确保使用 Next.js 的 `Image` 组件优化图片。

### 3. 代码分割

Next.js 15 已经自动进行代码分割，无需额外配置。

## 更新部署

### 自动更新

每次推送到 GitHub 都会自动触发新的部署。

### 手动重新部署

1. 在 Vercel Dashboard 中进入项目
2. 点击 **"Deployments"** 标签
3. 找到要重新部署的版本
4. 点击 **"..."** → **"Redeploy"**

## 回滚

如果需要回滚到之前的版本：

1. 在 Vercel Dashboard 中进入项目
2. 点击 **"Deployments"** 标签
3. 找到要回滚的版本
4. 点击 **"..."** → **"Promote to Production"**

## 监控和分析

Vercel 提供：

- **Analytics**：页面访问统计
- **Speed Insights**：性能监控
- **Logs**：实时日志查看

可以在项目设置中启用这些功能。

## 注意事项

1. **免费计划限制**：
   - 每月 100GB 带宽
   - 100 小时构建时间
   - 对于大多数项目来说已经足够

2. **环境变量**：
   - 不要在代码中硬编码敏感信息
   - 使用 Vercel 的环境变量功能

3. **构建时间**：
   - 首次部署可能需要较长时间
   - 后续部署会更快（利用缓存）

## 获取部署 URL

部署成功后，你可以在以下位置找到部署 URL：

1. **Vercel Dashboard**：项目概览页面
2. **GitHub**：如果配置了 GitHub 集成，会在 PR 中显示预览链接
3. **Vercel CLI**：运行 `vercel ls` 查看所有部署

## 更新 PROJECT_DESCRIPTION.md

部署成功后，记得更新 `PROJECT_DESCRIPTION.md` 中的前端 URL：

```markdown
**Deployed Frontend URL:** https://your-app-name.vercel.app
```

## 支持

如果遇到问题：

1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 查看 [Next.js 文档](https://nextjs.org/docs)
3. 检查 Vercel 构建日志
4. 在本地运行 `npm run build` 检查构建错误

