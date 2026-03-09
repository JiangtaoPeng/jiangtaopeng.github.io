# 🌿 Green Healing Blog

一个绿色治愈主题的个人博客，使用 Jekyll 构建，托管在 GitHub Pages。

![Green Healing Blog Preview](assets/images/banner.jpg)

## ✨ 特性

- 🎨 **治愈系设计** — 以鼠尾草绿和薄荷绿为主色调，柔和舒适
- 📱 **响应式布局** — 完美适配桌面、平板和手机
- ⚡ **极简高效** — 纯静态页面，无数据库，加载飞快
- 🔍 **SEO 友好** — 内置 SEO 标签、Sitemap 和 RSS Feed
- 📖 **阅读进度条** — 长文阅读时显示进度
- 🎭 **优雅动画** — 卡片淡入、悬浮效果，细节拉满
- 🌙 **自定义 SVG 图标** — 不依赖任何图标库

## 🚀 快速开始

### 方法一：GitHub Pages（推荐）

1. **Fork 本仓库** 或点击 "Use this template"

2. **修改仓库名** 为 `<你的用户名>.github.io`

3. **编辑配置** — 修改 `_config.yml` 中的个人信息：

```yaml
title: 你的博客名称
url: "https://yourusername.github.io"
author:
  name: 你的名字
  bio: "你的个人简介"
```

4. **等待部署** — GitHub Actions 会自动构建和部署

5. **访问博客** — 打开 `https://yourusername.github.io`

### 方法二：本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/green-healing-blog.git
cd green-healing-blog

# 安装依赖（需要 Ruby 和 Bundler）
bundle install

# 启动本地服务
bundle exec jekyll serve

# 浏览器打开 http://localhost:4000
```

## 📝 写新文章

在 `_posts/` 目录下创建 Markdown 文件，文件名格式：`YYYY-MM-DD-title.md`

```markdown
---
title: "文章标题"
date: 2026-03-08
tags: [标签1, 标签2]
subtitle: "可选的副标题"
cover: /assets/images/your-cover.jpg  # 可选的封面图
---

正文内容（支持 Markdown）...
```

## 📁 目录结构

```
green-healing-blog/
├── _config.yml          # 站点配置
├── _layouts/            # 页面布局模板
│   ├── default.html     # 基础布局
│   └── post.html        # 文章布局
├── _includes/           # 可复用组件
│   ├── header.html      # 导航栏
│   └── footer.html      # 页脚
├── _posts/              # 博客文章
├── assets/
│   ├── css/style.css    # 主样式表
│   ├── js/main.js       # 交互脚本
│   └── images/          # 图片资源
├── index.html           # 首页
├── about.md             # 关于页
├── archive.md           # 归档页
└── Gemfile              # Ruby 依赖
```

## 🎨 自定义

### 修改颜色

编辑 `assets/css/style.css` 中的 CSS 变量：

```css
:root {
  --green-600: #7cb342;    /* 修改主色调 */
  --bg-primary: #f9fdf6;   /* 修改背景色 */
  --text-primary: #2e3d2f; /* 修改文字颜色 */
}
```

### 更换图片

替换 `assets/images/` 下的图片文件：

| 文件 | 用途 | 建议尺寸 |
|------|------|----------|
| `banner.jpg` | 首页横幅 | 1200×400 |
| `avatar.jpg` | 关于页头像 | 240×240 |
| `nature-bg.jpg` | 文章封面 | 1200×600 |
| `favicon.svg` | 网站图标 | 32×32 |

## 📄 License

MIT License — 随意使用和修改。

---

> 🌿 用文字记录生活中的每一抹绿意。

