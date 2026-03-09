---
layout: post
title: "如何用 GitHub Pages 搭建个人博客"
date: 2026-03-10
author: PJT
tags: [教程, GitHub, Jekyll]
description: 一篇详细的 GitHub Pages 博客搭建教程
---

想要一个免费的个人博客？GitHub Pages 是一个绝佳选择。本文将介绍如何快速搭建一个美观的个人博客。

## 什么是 GitHub Pages？

GitHub Pages 是 GitHub 提供的静态网站托管服务，主要特点：

- 🆓 完全免费
- 🚀 自带 CDN 加速
- 🔒 支持 HTTPS
- 🎨 支持自定义域名

## 快速开始

### 1. 创建仓库

创建一个名为 `username.github.io` 的仓库，其中 `username` 是你的 GitHub 用户名。

### 2. 选择主题

你可以在仓库设置中选择 Jekyll 主题，或者自己编写主题。

### 3. 开始写作

创建 `_posts` 目录，按照 `YYYY-MM-DD-title.md` 的格式创建文章。

```markdown
---
layout: post
title: "我的第一篇文章"
date: 2026-03-10
---

这是文章内容...
```

## 进阶定制

### 添加自定义域名

1. 在仓库根目录创建 `CNAME` 文件
2. 填入你的域名
3. 在域名服务商处添加 CNAME 记录

### 添加评论系统

推荐使用 [Giscus](https://giscus.app/)，基于 GitHub Discussions：

```html
<script src="https://giscus.app/client.js"
        data-repo="your-repo"
        data-repo-id="your-repo-id"
        data-category="Announcements"
        data-mapping="pathname"
        async>
</script>
```

## 总结

GitHub Pages 是搭建个人博客的最佳选择之一，免费、快速、可定制。希望这篇教程对你有所帮助！