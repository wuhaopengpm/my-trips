# Trip Pack V3.7 结构

每趟旅行使用一个独立 JSON 文件，并由 `trips.json` 引用。正式机器可读规范见 `trip-pack.schema.json`。

## 根字段

- `id`、`city`、`country`：旅行标识与目的地。
- `meta`：标题、副标题、开始/结束日期和路线摘要。
- `days`：按日期排序的每日行程。
- `hotels`、`orderTemplates`、`checklist`、`guides`：酒店候选、订单槽位、行前准备和资料。
- `finance`、`emergency`：预算配置和应急信息。
- `theme`、`coverImage`、`coverPosition`、`coverCredit`：主题与封面。

## 响应式封面

旧攻略只写 `coverImage` 仍然兼容。新攻略可增加：

```json
{
  "coverImage": "./cover-fallback.jpg",
  "coverImageSrcset": "./cover-640.webp 640w, ./cover-1280.webp 1280w",
  "coverImageSizes": "(max-width: 780px) 100vw, 780px",
  "coverPosition": "center 62%"
}
```

## Day

每个 Day 必须包含 `day`、`date`、`label`、`title`、`route`、`hotel`、`transport`、`booking`、`backup`、`timeline` 和 `places`。

```json
{
  "day": 1,
  "date": "2027-01-01",
  "label": "1月1日",
  "title": "抵达",
  "route": "机场 → 酒店",
  "hotel": "酒店",
  "transport": "接机",
  "booking": "保存订单",
  "backup": "航班延误时顺延",
  "timeline": [["09:00", "抵达", "说明"]],
  "places": [["Airport", 0, 0]]
}
```

`places` 的顺序就是离线路线连接顺序；纬度范围为 -90–90，经度范围为 -180–180。

## 校验与发布

运行 `node scripts/validate-trip-data.mjs`。新增内置城市时需要同时更新 `trips.json` 和 `sw.js` 的预缓存资源；导入本机的攻略包无需修改 Service Worker。
