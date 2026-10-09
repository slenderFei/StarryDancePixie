# 微信扫码注册/登录配置

登录页使用微信开放平台网站应用的真实二维码。前端只负责展示二维码和接收回调，微信 `AppSecret` 必须由服务端保存。

## 前端配置

复制 `.env.example` 为部署环境的环境变量文件，并填写：

```text
VITE_WECHAT_APP_ID=微信开放平台网站应用 AppID
VITE_WECHAT_REDIRECT_URI=https://你的域名/
VITE_AUTH_API_BASE=https://你的认证服务域名
VITE_WECHAT_EXCHANGE_PATH=/api/auth/wechat/exchange
```

在微信开放平台中把 `VITE_WECHAT_REDIRECT_URI` 的域名加入授权回调域名。不要把 `AppSecret` 写进 `.env` 前端变量，也不要提交到 Git。

## 服务端接口契约

前端会向 `${VITE_AUTH_API_BASE}${VITE_WECHAT_EXCHANGE_PATH}` 发送：

```json
{
  "code": "微信回调 code",
  "state": "一次性 state",
  "redirectUri": "配置的回调地址"
}
```

服务端需要使用 AppID/AppSecret 向微信换取 `openid`，校验 `state` 和回调地址，创建或查找用户，并返回：

```json
{
  "ok": true,
  "user": {
    "username": "wechat_用户标识",
    "nickname": "微信昵称",
    "openid": "微信 openid",
    "role": "user"
  }
}
```

接口应启用 HTTPS、限制 CORS 来源并设置合理的请求频率限制。扫码成功后，前端会把返回的微信用户注册到本地会话并记录登录来源为“微信扫码”。

如果没有配置 `VITE_WECHAT_APP_ID`，登录页会显示配置提示，不会再提供演示账号绕过注册。

## 本地开发与线上部署

直接在 `http://127.0.0.1:5173` 启动时，通常不能完成微信扫码登录：微信开放平台要求回调域名已登记，且授权码还必须由服务端使用 `AppSecret` 换取用户身份。可以用 HTTPS 隧道把本地服务映射到已经登记的域名进行联调。

上传部署并不会自动解决这件事。线上域名、`VITE_WECHAT_APP_ID`、回调地址和服务端交换接口都配置正确后才可用；缺少任一项，二维码可能显示但扫码回调会失败。

当前项目的普通账号和登录审计默认保存在浏览器 `localStorage` 中，因此 root 看到的是同一浏览器设备上的用户与登录记录。若要跨设备统计所有玩家，需要把用户、会话和登录事件迁移到服务端数据库，并让账号密码登录也调用同一认证服务。
