# datacenter-screen

数据中心运行监控大屏 — 基于真实服务器监控数据的可视化仪表盘。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | HTML + CSS + ECharts 5.x |
| 后端 | Python Flask |
| 数据库 | MySQL 8.0 |
| 部署 | Docker |

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 确保 MySQL Docker 容器运行中
docker start mysql8

# 3. 启动 Flask
python app.py

# 4. 浏览器打开
# http://localhost:5000
```

## 数据说明

数据来源为服务器监控采集系统（tsar），包含 20 台服务器的运行指标：

| 表 | 行数 | 说明 |
|----|------|------|
| host_detail | 20 | 服务器基础信息 |
| mod_detail | 55 | 监控指标定义 |
| disk_tsar | 12,000 | 磁盘监控时序数据 |
| pref_tsar | 67,200 | 性能监控时序数据 |

## 项目结构

```
datacenter-screen/
├── app.py              # Flask 后端 API
├── requirements.txt    # Python 依赖
├── design.md           # UI 设计规范
├── templates/
│   └── index.html      # 大屏页面
└── static/
    └── style.css       # 样式
```

## 许可证

[MIT](LICENSE)
