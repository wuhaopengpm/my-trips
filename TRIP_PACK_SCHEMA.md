# Trip Pack V3.2 结构

以后每个城市/行程仍然是一个独立 JSON 文件。

新增支持字段：

```json
{
  "id": "tokyo-2027-04",
  "city": "东京",
  "country": "日本",
  "theme": "default",
  "meta": {
    "title": "Tokyo 6-Day",
    "subtitle": "东京 6 天旅行助手",
    "start": "2027-04-01",
    "end": "2027-04-06",
    "route": "新宿 · 浅草 · 银座 · 镰仓"
  },
  "checklist": [
    {
      "id": "hotel",
      "group": "住宿",
      "title": "确认酒店",
      "note": "保存确认单"
    }
  ],
  "days": []
}
```

## V3.2 新功能
- 旅行库自动按：旅行中 → 即将出发 → 已结束排序
- 出发倒计时
- 行前 Checklist
- “回到今天”
- 明日准备
- 订单二维码全屏
- 重要订单置顶

## GitHub 内置新城市
仍然只需要：
1. 上传 `<city>.json`
2. 更新 `trips.json`
3. 更新 `sw.js` 缓存清单

后续可以直接让 ChatGPT 为你生成“城市升级补丁包”，无需自己编辑 JSON。


## V3.3 Finance
```json
"finance": {
  "baseCurrency": "IDR",
  "homeCurrency": "CNY",
  "planningRate": 2250,
  "rateLabel": "1 CNY = 2,250 IDR",
  "budgetRange": {"minIDR":25400000,"maxIDR":38900000,"minCNY":11300,"maxCNY":17300}
}
```


## V3.4 地图要求
无需新增专门地图字段。地图直接使用每天已有的：

```json
"places": [
  ["Place Name", -8.74817, 115.16717]
]
```

经纬度必须是真实坐标。每个 Day 的 `places` 顺序即当天路线连接顺序。
