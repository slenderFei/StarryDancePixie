# Cloudflare Pages 部署文档

这份文档用于把 `Starry Dance Pixie` 部署到 Cloudflare Pages。对这个项目来说，最适合新手的方式是 `Git integration`，因为仓库已经有标准的 Vite 构建流程。

官方参考：

- [Cloudflare Pages Overview](https://developers.cloudflare.com/pages/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## 1. 部署前准备

先在本地确认项目能正常构建。

```bash
npm install
npm run build
```

构建成功后，会生成 `dist/` 目录。Cloudflare Pages 的构建输出目录就是这里。

这个项目当前已经满足 Cloudflare Pages 的基本要求：

- `vite.config.js` 已设置 `base: './'`
- 构建命令是 `npm run build`
- 输出目录是 `dist`

## 2. 方式一：Git 集成部署

这是推荐方式。Cloudflare 会在你每次推送代码后自动构建并部署。

### 操作步骤

1. 登录 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 选择 `Create application`。
4. 选择 `Pages`。
5. 选择 `Connect to Git`。
6. 连接你的 GitHub 账号。
7. 选择仓库 `slenderFei/StarryDancePixie`。
8. 配置构建参数：

```txt
Framework preset: None
Build command: npm run build
Build output directory: dist
```

9. 点击 `Save and Deploy`。

### 部署后会发生什么

Cloudflare Pages 会自动：

1. 拉取仓库代码。
2. 安装依赖。
3. 执行 `npm run build`。
4. 发布 `dist/` 里的静态文件。

首次成功后，会得到一个 `*.pages.dev` 公网地址。

## 3. 方式二：Direct Upload 手动发布

如果你想先在本地构建，再把产物传上去，可以用 Direct Upload。

### 操作步骤

1. 本地执行：

```bash
npm run build
```

2. 登录 Cloudflare Dashboard。
3. 进入 `Workers & Pages`。
4. 选择 `Create application`。
5. 选择 `Pages`。
6. 选择 `Direct Upload`。
7. 上传 `dist/` 目录。

## 4. 自定义域名

如果你以后想把站点绑定到自己的域名，可以在 Pages 项目里配置 `Custom domains`。

常规步骤是：

1. 打开 Pages 项目。
2. 进入 `Custom domains`。
3. 点击 `Set up a domain`。
4. 输入你的域名并继续。

Cloudflare 会帮你处理大部分证书和接入流程。

## 5. 公网访问地址怎么看

Cloudflare Pages 成功发布后，会生成一个类似这样的地址：

```txt
https://<project-name>.pages.dev
```

如果你连接了自定义域名，那么访问地址就是你自己的域名。

## 6. 新手最稳流程

如果你第一次部署，照这个顺序来最稳：

```bash
npm install
npm run build
git add .
git commit -m "prepare cloudflare deploy"
git push
```

然后去 Cloudflare Dashboard：

1. 创建 Pages 项目。
2. 连接 GitHub 仓库。
3. 填 `npm run build` 和 `dist`。
4. 等待部署完成。

## 7. 常见问题

### 1. 页面白屏

优先检查：

- `vite.config.js` 是否保留了 `base: './'`
- `npm run build` 是否成功
- Cloudflare Pages 的 `Build output directory` 是否填了 `dist`

### 2. 摄像头打不开

这个项目需要摄像头权限，公网访问必须通过 `https://`。Cloudflare Pages 默认满足这一点。

### 3. 发布后资源 404

通常是以下原因之一：

- 上传的不是 `dist/`
- 构建输出目录没写对
- 代码没重新部署

### 4. GitHub 更新了，Cloudflare 没更新

如果你用的是 Git 集成，推送到 GitHub 后 Cloudflare 会自动部署。若没触发，回到 Pages 项目检查仓库连接状态。

## 8. 我建议你选哪种

如果你只是想让项目上线，选 `Git integration`。

如果你想自己掌控每次发布、先本地打包再上传，选 `Direct Upload`。
