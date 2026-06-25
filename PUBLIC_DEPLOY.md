# 公网部署详细流程

这份文档讲的是把 `Starry Dance Pixie` 发布到公网，目标是让别人可以直接打开链接使用。当前项目已经适配了 GitHub Pages，最适合新手的公网部署方式也是 GitHub Pages。

## 先看结论

如果你只想最快上线，推荐这条路线：

1. 把项目推到 GitHub 仓库。
2. 在 GitHub 仓库里开启 Pages。
3. 让 GitHub Actions 自动执行 `npm install`、`npm run build`、发布 `dist/`。
4. 等待 GitHub 给出公网网址。

这个项目已经准备好了：

- `vite.config.js` 已设置 `base: './'`，适合 GitHub Pages 子路径部署。
- `.github/workflows/deploy.yml` 已配置自动构建和发布。
- `npm run build` 已能正常生成 `dist/`。

## 部署前准备

先确认本地代码状态是干净的。

```bash
git status --short --branch
```

你应该能看到当前分支是 `main`，而且没有未提交的关键改动。

再确认项目能正常打包。

```bash
npm run build
```

成功后会生成 `dist/` 目录，这就是最终要发布的静态文件。

## GitHub 仓库准备

如果仓库已经存在，可以直接跳到下一节。

如果还没有仓库，先在 GitHub 新建一个空仓库。建议：

- 仓库名用 `StarryDancePixie`
- 不要先勾选自动创建 README
- 公开仓库最省事，GitHub Pages 免费也最顺手

然后把本地仓库推上去。

```bash
git remote add origin git@github.com:你的用户名/StarryDancePixie.git
git push -u origin main
```

如果你已经配好了 SSH key，推送时不会再要用户名和密码。

## 开启 GitHub Pages

进入 GitHub 仓库页面，按这个顺序操作：

1. 打开仓库。
2. 点击 `Settings`。
3. 在左侧找到 `Pages`。
4. 在 `Build and deployment` 区域，把 `Source` 选择为 `GitHub Actions`。
5. 保存设置。

这个项目用的是 GitHub Actions 工作流发布，所以不需要选择 `Deploy from a branch`。

## 自动部署流程

一旦你把代码推到 `main` 分支，GitHub Actions 会自动开始执行。

流程大概是：

1. 拉取仓库代码。
2. 安装依赖。
3. 执行 `npm run build`。
4. 上传 `dist/`。
5. 发布到 GitHub Pages。

你可以在仓库里的 `Actions` 标签页看到进度和结果。

## 发布后怎么访问

GitHub Pages 成功后，会给你一个公网地址，通常类似：

```txt
https://你的用户名.github.io/StarryDancePixie/
```

第一次发布后，Pages 页面里也会显示最终地址。

## 本地调试和线上验证

上线前建议先本地预览一次。

```bash
npm run dev
```

打开终端里显示的本地地址，一般是：

```txt
http://localhost:5173/
```

上线后再去公网地址检查下面几个点：

- 首页能否正常显示
- 摄像头权限是否能弹出
- 进入经典模式后 3D 场景是否正常加载
- 街机模式下落词是否正常出现
- 结算页是否正常显示

## 常见问题

### 1. 页面白屏

先看这几个地方：

- `vite.config.js` 是否保留了 `base: './'`
- `npm run build` 是否真的成功
- GitHub Pages 是否已经选择 `GitHub Actions`

### 2. 摄像头打不开

摄像头功能在公网环境下必须通过 `https://` 访问，`http://` 不行。

### 3. 线上资源 404

通常是这几种原因：

- 上传的不是 `dist/` 里的内容
- `base` 没设成 `./`
- GitHub Pages 没有正确发布到当前仓库路径

### 4. Actions 失败

优先看 `Actions` 里的报错日志，常见原因有：

- 依赖安装失败
- 构建报错
- Pages 没开启

## 自定义域名

如果你之后想用自己的域名，也可以接在 GitHub Pages 上。

基本思路是：

1. 在 Pages 设置里填写自定义域名。
2. 在域名服务商里配置 DNS。
3. 等 GitHub 验证并签发 HTTPS 证书。

如果你暂时只是想让项目先上线，不建议一开始就折腾自定义域名。

## 最简版流程

如果只记一条最短路线，就记这个：

```bash
npm install
npm run build
git add .
git commit -m "deploy"
git push
```

然后去 GitHub 仓库的 `Actions` 页面看部署结果。
