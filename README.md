# My Trips V3.7

原生 HTML、CSS、JavaScript 构建的多城市离线旅行助手，可直接部署到 GitHub Pages。

## 功能

- JSON 攻略包、旅行库、倒计时和当天智能时间轴
- 离线路线示意图、地点打卡与外部地图导航
- 订单截图/二维码、本机记账、Checklist、紧急资料
- 响应式 WebP 封面、PWA 安装和离线缓存
- 本机数据导出与攻略包导入

## 校验

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
```

图片变体通过 `scripts/build-images.mjs` 生成。脚本使用 Codex 工作区自带的 Sharp，仅用于开发，不是项目生产依赖。

## 添加内置旅行

1. 复制并填写 `trip-pack-template.json`。
2. 在 `trips.json` 添加索引。
3. 把 JSON 和图片加入 `sw.js` 的 `CORE` 缓存。
4. 运行校验与测试后部署。

攻略包字段详见 `TRIP_PACK_SCHEMA.md` 和 `trip-pack.schema.json`。

## 图片授权

Kelingking Beach 封面作者 Chainwit，来源 Wikimedia Commons，许可 CC BY 4.0。
