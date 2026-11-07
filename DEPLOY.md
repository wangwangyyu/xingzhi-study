# 长期网址部署

已准备 GitHub Pages 自动部署配置，当前尚未发布。完整站点约 452 MiB，适合个人使用；GitHub Pages 发布站点上限 1 GB。国内网络的速度与可达性需要上线后实际测试。

## 发布内容

执行 `npm run build` 生成 `dist/`。其中只有网站运行文件和完整 `question-bank/`，保留题库来源说明，不包含浏览器学习记录、sources 原始下载目录或 artifacts 测试截图。学习记录仍保存在各设备浏览器，跨设备需要导出和导入。

## GitHub Pages

1. 在 GitHub 登录，创建公开仓库，例如 `xingzhi-study`。免费方案使用公开仓库，推送的源代码和题库将可公开访问。
2. 把本项目代码推送到该仓库的 `main` 分支。`.gitignore` 已排除下载压缩包、原始仓库副本和生成的 dist；不要通过网页逐一上传四万多个文件。
3. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
4. 在 Actions 中运行 **Publish Xingzhi**，或推送新的提交触发构建。工作流先执行完整题库检查，再构建和发布。
5. 部署成功后从工作流的 deployment 输出打开实际网址。默认形如 `https://用户名.github.io/仓库名/#real`；仅为格式示例，账号和仓库未创建前并不是可访问网址。

本机没有已登录的 GitHub 账号。需要用户在 GitHub/官方登录窗口完成登录；不需要在聊天中发送密码或令牌。完成账号连接后才能创建真实网址并验证 HTTPS、题库和手机访问。

上线后电脑可以关机。只要账号、仓库和 Pages 服务持续启用，网址可以持续使用；没有托管平台保证永久服务。自定义域名可后续绑定。

## 其他托管

`dist/` 也可放到已有静态托管或云服务器的网站根目录。本站使用 hash 路由，不需要服务器路由回退；必须完整保留题库的相对目录。托管应支持约 452 MiB、超过 42,000 个文件，并启用 HTTPS。不要将整个工作目录作为公开网站根目录。

限制参考：https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
