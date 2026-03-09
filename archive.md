---
layout: default
title: 归档
permalink: /archive/
---

<div class="section-header">
  <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
  <h2>文章归档</h2>
</div>

{% assign postsByYear = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
{% for year in postsByYear %}
<div class="archive-year">
  <h3>🌿 {{ year.name }} 年 <span style="font-size:0.85rem;color:var(--text-light);font-weight:400">（{{ year.items.size }} 篇）</span></h3>
  <ul class="archive-list">
    {% for post in year.items %}
    <li>
      <span class="archive-date">{{ post.date | date: "%m-%d" }}</span>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    </li>
    {% endfor %}
  </ul>
</div>a
{% endfor %}

