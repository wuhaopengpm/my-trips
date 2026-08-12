# Trip Pack 结构

以后每个城市/行程都做成一个独立 JSON 攻略包，App 不需要重装。

最少字段：

```json
{
  "id": "tokyo-2027-04",
  "city": "东京",
  "country": "日本",
  "meta": {
    "title": "Tokyo 6-Day",
    "subtitle": "东京 6 天旅行助手",
    "start": "2027-04-01",
    "end": "2027-04-06",
    "route": "新宿 · 浅草 · 银座 · 镰仓"
  },
  "days": [
    {
      "day": 1,
      "date": "2027-04-01",
      "label": "4月1日",
      "title": "抵达东京",
      "route": "NRT → 新宿",
      "hotel": "酒店名",
      "transport": "交通说明",
      "booking": "预订说明",
      "backup": "备用方案",
      "timeline": [
        ["15:00", "抵达成田", "入境取行李"]
      ],
      "places": [
        ["Narita Airport", 35.7720, 140.3929]
      ]
    }
  ],
  "hotels": [],
  "orderTemplates": [],
  "guides": {},
  "emergency": {
    "general": "当地紧急电话",
    "note": "说明"
  }
}
```

有两种加入方式：
1. 内置：把 JSON 放进 `trips/`，再在 `trips.json` 增加一条记录。
2. 手机本地导入：直接在 App 的“旅行库 → 导入新城市”选择攻略包 JSON，无需重新部署。
