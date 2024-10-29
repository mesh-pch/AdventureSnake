# 贪食蛇游戏

一个基于 Web 的多关卡贪食蛇游戏，具有用户系统、道具系统和特效系统。

## 主要功能

- 用户系统：注册、登录、进度保存
- 多关卡系统：不同难度等级
- 道具系统：复活、减速、得分翻倍
- 特效系统：烟花、爆炸效果
- 特殊物品：食物、毒物、石头
- 平滑的蛇身移动效果
- 穿墙功能
- 长按加速功能

## 安装和运行

### 1. 克隆项目 
```bash
git clone https://github.com/mesh-pch/AdventureSnake.git
cd snake-game
```

### 2. 创建虚拟环境
```bash
#Windows
python -m venv venv
venv\Scripts\activate

#Linux/MacOS
python -m venv venv
source venv/bin/activate
```


### 3. 安装依赖
```bash
bash
pip install flask
```

### 4. 初始化数据库
```bash
python
>>> from app import app
>>> with app.app_context():
... from database import init_db
... init_db()
>>> exit()
```
### 5. 运行游戏
```
bash
python app.py
```


### 6. 访问游戏
打开浏览器访问：`http://localhost:5000`

## 游戏控制

- 方向键：控制蛇的移动
- 空格键：长按加速
- 点击道具：使用道具效果

## 游戏规则

- 普通食物：+10分
- 特殊食物：+20分
- 毒物：-10分
- 石头：游戏结束
- 穿墙：蛇可以从边界穿过
- 道具获取：随机概率（0.5%）

## 项目结构

```
snake_game/
├── app.py                 # Flask应用主文件
├── database.py           # 数据库操作
├── static/
│   ├── css/
│   │   └── style.css    # 样式文件
│   └── js/
│       └── game.js      # 游戏核心逻辑
└── templates/
    ├── login.html       # 登录页面
    ├── register.html    # 注册页面
    └── game.html        # 游戏主页面
```

## 系统要求

- Python 3.7+
- 现代浏览器（支持HTML5 Canvas）
- SQLite3

## 常见问题解决

### 1. 端口被占用
```bash
修改端口
python app.py --port 5001
```

### 2. 数据库错误
```bash
重置数据库
rm snake_game.db
python app.py
```

### 3. 权限问题
```bash
#Linux/MacOS
chmod +x app.py
sudo chown -R $USER:$USER .
```


## 开发调试
```bash
#Linux/MacOS
export FLASK_ENV=development
export FLASK_DEBUG=1
#Windows
set FLASK_ENV=development
set FLASK_DEBUG=1
```

### 运行
```
flask run
```

## 技术栈

- 前端：HTML5 Canvas, CSS3, JavaScript
- 后端：Python Flask
- 数据库：SQLite3

## 贡献

欢迎提交 Issue 和 Pull Request

## 许可证

MIT License

## 联系方式

[yslrpch@126.com]
