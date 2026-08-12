# My Trips V3.1 — GitHub Pages 版

这是专门为 GitHub 网页上传优化的多城市旅行 PWA。

## 目录结构

所有城市攻略 JSON 都放在仓库根目录：

```text
my-trips/
├── index.html
├── app.js
├── styles.css
├── trips.json
├── manifest.webmanifest
├── sw.js
├── icon-192.png
├── icon-512.png
├── bali-2026-09.json
├── trip-pack-template.json
├── TRIP_PACK_SCHEMA.md
└── README.md
```

以后新增东京，只需要增加：

```text
tokyo-2027-04.json
```

并在 `trips.json` 里增加一条：

```json
{
  "id": "tokyo-2027-04",
  "city": "东京",
  "country": "日本",
  "start": "2027-04-01",
  "end": "2027-04-06",
  "days": 6,
  "route": "新宿 · 浅草 · 银座",
  "data": "./tokyo-2027-04.json",
  "status": "upcoming"
}
```

## GitHub Pages

仓库建议：
- repository: `my-trips`
- branch: `main`
- Pages source: Deploy from a branch
- folder: `/ (root)`

发布地址形式：

`https://你的用户名.github.io/my-trips/`

## iPhone

Safari 打开 GitHub Pages 地址：
分享 → 添加到主屏幕。

首次联网完整打开后，Service Worker 会缓存核心文件。
