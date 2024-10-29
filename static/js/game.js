document.addEventListener('DOMContentLoaded', function() {
    const levelSelect = document.getElementById('level-select');
    const gameContainer = document.getElementById('game-container');
    const levelItems = document.querySelectorAll('.level-item.unlocked');
    let game = null;

    // 关卡选择
    levelItems.forEach(item => {
        item.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            startGame(level);
        });
    });

    // 下拉菜单切换关卡
    document.getElementById('levelSelect').addEventListener('change', function() {
        const level = parseInt(this.value);
        if (game) {
            game.stopGame();
        }
        startGame(level);
    });

    function startGame(level) {
        levelSelect.classList.add('fade-out');
        setTimeout(() => {
            levelSelect.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            gameContainer.classList.add('fade-in');
            game = new SnakeGame(level);
        }, 500);
    }
});

class SnakeGame {
    constructor(level) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.snake = [{x: 10, y: 10}];
        this.direction = 'right';
        this.food = this.generateFood();
        this.score = 0;
        this.level = level;
        this.baseSpeed = 150 - (level - 1) * 45; // 基础速度
        this.speed = this.baseSpeed;
        this.specialItems = [];
        this.lastSpecialItemTime = 0;
        this.specialItemDuration = 3000; // 3秒
        this.isGameOver = false;
        this.powerUps = []; // 存储道具
        this.activePowerUp = null; // 当前激活的道具
        this.isAccelerating = false; // 是否在加速
        this.snakeHistory = []; // 添加蛇的历史位置记录，用于平滑转弯
        this.cornerRadius = this.gridSize / 2; // 转弯圆角半径
        
        this.canvas.width = 500;
        this.canvas.height = 500;
        
        this.setupGame();
    }

    setupGame() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyPress(event);
            if (event.code === 'Space' && !this.isAccelerating) {
                this.startAcceleration();
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'Space') {
                this.stopAcceleration();
            }
        });

        this.gameLoop = setInterval(this.update.bind(this), this.speed);
        this.createPowerUpButtons();
        this.loadPowerUps();
    }

    loadPowerUps() {
        fetch('/get_powerups')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.powerUps = data.powerups;
                    this.updatePowerUpDisplay();
                }
            });
    }

    createPowerUpButtons() {
        const powerUpContainer = document.createElement('div');
        powerUpContainer.id = 'powerUpContainer';
        powerUpContainer.style.position = 'absolute';
        powerUpContainer.style.bottom = '10px';
        powerUpContainer.style.left = '50%';
        powerUpContainer.style.transform = 'translateX(-50%)';
        document.body.appendChild(powerUpContainer);
    }

    addPowerUpButton(type) {
        const powerUpContainer = document.getElementById('powerUpContainer');
        const button = document.createElement('button');
        button.textContent = type;
        button.style.margin = '0 5px';
        button.onclick = () => this.activatePowerUp(type);
        powerUpContainer.appendChild(button);
    }

    activatePowerUp(type) {
        if (this.powerUps[type] > 0) {
            switch (type) {
                case '复活':
                    this.isGameOver = false;
                    this.snake = [{x: 10, y: 10}];
                    this.direction = 'right';
                    this.score = 0;
                    document.getElementById('score').textContent = this.score;
                    break;
                case '减速':
                    clearInterval(this.gameLoop);
                    this.speed += 50; // 减速
                    this.gameLoop = setInterval(this.update.bind(this), this.speed);
                    break;
                case '得分翻倍':
                    this.score *= 2;
                    document.getElementById('score').textContent = this.score;
                    break;
            }
            this.updatePowerUp(type, -1);
        }
    }

    updatePowerUp(type, change) {
        fetch('/update_powerup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                powerup_type: type,
                change: change
            })
        }).then(response => response.json())
          .then(data => {
              if (data.success) {
                  this.powerUps[type] = (this.powerUps[type] || 0) + change;
                  this.updatePowerUpDisplay();
                  if (this.powerUps[type] <= 0) {
                      this.clearPowerUpButtons();
                      this.loadPowerUps();
                  }
              }
          });
    }

    clearPowerUpButtons() {
        const powerUpContainer = document.getElementById('powerUpContainer');
        powerUpContainer.innerHTML = '';
    }

    handleKeyPress(event) {
        const key = event.key;
        const directions = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        if (key in directions) {
            const newDirection = directions[key];
            const opposites = {
                'up': 'down',
                'down': 'up',
                'left': 'right',
                'right': 'left'
            };
            
            if (this.direction !== opposites[newDirection]) {
                this.direction = newDirection;
            }
            event.preventDefault();
        }
    }

    update() {
        if (this.isGameOver) return;

        // 移动蛇
        const head = {...this.snake[0]};
        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 处理穿墙
        if (head.x < 0) {
            head.x = Math.floor(this.canvas.width / this.gridSize) - 1;
        } else if (head.x >= this.canvas.width / this.gridSize) {
            head.x = 0;
        }
        
        if (head.y < 0) {
            head.y = Math.floor(this.canvas.height / this.gridSize) - 1;
        } else if (head.y >= this.canvas.height / this.gridSize) {
            head.y = 0;
        }

        // 检查自身碰撞
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            const centerX = this.food.x * this.gridSize + this.gridSize / 2;
            const centerY = this.food.y * this.gridSize + this.gridSize / 2;
            this.createFirework(centerX, centerY);
            this.food = this.generateFood();
        } else {
            this.snake.pop();
        }

        // 检查是否接近食物
        const distanceToFood = Math.sqrt(
            Math.pow(head.x - this.food.x, 2) + 
            Math.pow(head.y - this.food.y, 2)
        );

        if (distanceToFood <= 15 && Date.now() - this.lastSpecialItemTime > this.specialItemDuration) {
            // 清除之前的特殊物品
            this.specialItems = [];
            // 生成新的特殊物品（包括移动原始食物）
            this.generateSpecialItems();
            this.lastSpecialItemTime = Date.now();
        }

        // 更新特殊物品状态
        this.updateSpecialItems(head);

        // 绘制游戏
        this.draw();
    }

    checkCollision(head) {
        // 穿墙处理
        if (head.x < 0) {
            head.x = Math.floor(this.canvas.width / this.gridSize) - 1;
        } else if (head.x >= this.canvas.width / this.gridSize) {
            head.x = 0;
        }
        
        if (head.y < 0) {
            head.y = Math.floor(this.canvas.height / this.gridSize) - 1;
        } else if (head.y >= this.canvas.height / this.gridSize) {
            head.y = 0;
        }

        // 只检查自身碰撞
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    generateFood() {
        const food = {
            x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
            y: Math.floor(Math.random() * (this.canvas.height / this.gridSize))
        };

        // 确保食物不会生成在蛇身上
        while (this.snake.some(segment => segment.x === food.x && segment.y === food.y)) {
            food.x = Math.floor(Math.random() * (this.canvas.width / this.gridSize));
            food.y = Math.floor(Math.random() * (this.canvas.height / this.gridSize));
        }

        // 0.5% 概率生成道具
        if (Math.random() < 0.005) {
            const powerUpTypes = ['复活', '减速', '得分翻倍'];
            const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            this.powerUps.push(powerUpType);
            this.addPowerUpButton(powerUpType);
        }

        return food;
    }

    generateSpecialItems() {
        // 获取3x3网格的所有可能位置（包括中心位置）
        const positions = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                positions.push({
                    x: this.food.x + dx,
                    y: this.food.y + dy
                });
            }
        }

        // 随机选择一个位置移动原始食物
        const foodPosIndex = Math.floor(Math.random() * positions.length);
        const newFoodPos = positions.splice(foodPosIndex, 1)[0];
        this.food.x = newFoodPos.x;
        this.food.y = newFoodPos.y;

        // 随机生成1-3个特殊物品
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const items = ['food', 'poison', 'rock'];
        
        // 在剩余位置中随机生成特殊物品
        for (let i = 0; i < itemCount && positions.length > 0; i++) {
            const posIndex = Math.floor(Math.random() * positions.length);
            const pos = positions.splice(posIndex, 1)[0];
            const itemType = items[Math.floor(Math.random() * items.length)];
            
            this.specialItems.push({
                type: itemType,
                x: pos.x,
                y: pos.y,
                createTime: Date.now(),
                isVisible: true
            });
        }
    }

    // 添加烟花特效
    createFirework(x, y) {
        const particles = [];
        const particleCount = 30;
        const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 2;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0
            });
        }

        const animate = () => {
            this.ctx.save();
            particles.forEach((particle, index) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // 重力效果
                particle.life -= 0.02;

                if (particle.life > 0) {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    particles.splice(index, 1);
                }
            });
            this.ctx.restore();

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 添加爆炸特效
    createExplosion(x, y) {
        const particles = [];
        const particleCount = 20;
        const colors = ['#ff0000', '#ff6600', '#ffff00'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 2;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0
            });
        }

        const animate = () => {
            this.ctx.save();
            particles.forEach((particle, index) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.size *= 0.95;
                particle.life -= 0.03;

                if (particle.life > 0) {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    particles.splice(index, 1);
                }
            });
            this.ctx.restore();

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateSpecialItems(head) {
        const currentTime = Date.now();
        this.specialItems = this.specialItems.filter(item => {
            // 检查是否过期
            if (currentTime - item.createTime > this.specialItemDuration) {
                return false;
            }

            // 检查是否被吃到
            if (head.x === item.x && head.y === item.y) {
                const centerX = item.x * this.gridSize + this.gridSize / 2;
                const centerY = item.y * this.gridSize + this.gridSize / 2;

                switch (item.type) {
                    case 'food':
                        this.score += 20;
                        this.showSpecialEffect('双倍分数！');
                        this.createFirework(centerX, centerY);
                        break;
                    case 'poison':
                        this.score -= 10;
                        this.showSpecialEffect('中毒！-10分');
                        break;
                    case 'rock':
                        this.createExplosion(centerX, centerY);
                        setTimeout(() => this.gameOver(), 500);
                        break;
                }
                document.getElementById('score').textContent = this.score;
                return false;
            }

            // 闪烁效果
            if (currentTime % 500 < 250) {
                item.isVisible = !item.isVisible;
            }

            return true;
        });
    }

    showSpecialEffect(text) {
        const effect = document.createElement('div');
        effect.className = 'special-effect';
        effect.textContent = text;
        effect.style.position = 'absolute';
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '24px';
        effect.style.color = '#ff0000';
        effect.style.animation = 'fadeOut 1s forwards';
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 1000);
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 设置背景色
        this.ctx.fillStyle = '#FFF8DC';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制蛇
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.strokeStyle = '#45a049';
        this.ctx.lineWidth = 2;

        // 绘制平滑的蛇身
        for (let i = 0; i < this.snake.length; i++) {
            const current = this.snake[i];
            const next = this.snake[i + 1];
            const prev = this.snake[i - 1];

            if (i === 0) {
                // 蛇头
                this.ctx.beginPath();
                this.ctx.roundRect(
                    current.x * this.gridSize,
                    current.y * this.gridSize,
                    this.gridSize - 2,
                    this.gridSize - 2,
                    8
                );
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                // 蛇身
                if (next) {
                    // 计算当前段的方向
                    const dx = next.x - current.x;
                    const dy = next.y - current.y;
                    
                    // 计算前一段的方向
                    const prevDx = current.x - prev.x;
                    const prevDy = current.y - prev.y;

                    // 如果方向发生改变，绘制圆角
                    if (dx !== prevDx || dy !== prevDy) {
                        // 绘制转弯处的圆角
                        this.ctx.beginPath();
                        this.ctx.arc(
                            current.x * this.gridSize + this.gridSize / 2,
                            current.y * this.gridSize + this.gridSize / 2,
                            this.cornerRadius,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                        this.ctx.stroke();
                    }
                }

                // 绘制身体段
                this.ctx.beginPath();
                this.ctx.roundRect(
                    current.x * this.gridSize,
                    current.y * this.gridSize,
                    this.gridSize - 2,
                    this.gridSize - 2,
                    5
                );
                this.ctx.fill();
                this.ctx.stroke();
            }
        }

        // 绘制食物
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = `${this.gridSize}px Arial`;
        this.ctx.fillText('🍎', 
            this.food.x * this.gridSize, 
            (this.food.y + 1) * this.gridSize
        );

        // 绘制特殊物品
        this.specialItems.forEach(item => {
            if (!item.isVisible) return;
            
            let emoji;
            switch (item.type) {
                case 'food': emoji = '🍏'; break;
                case 'poison': emoji = '☠️'; break;
                case 'rock': emoji = '🪨'; break;
            }
            
            this.ctx.fillText(emoji,
                item.x * this.gridSize,
                (item.y + 1) * this.gridSize
            );
        });

        // 如果在加速状态，添加视觉提示
        if (this.isAccelerating) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('加速中', 10, 30);
        }
    }

    gameOver() {
        this.isGameOver = true;
        clearInterval(this.gameLoop);
        this.stopAcceleration(); // 保加速状态被清除
        
        // 保存分数
        fetch('/save_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level: this.level,
                score: this.score
            })
        });

        // 显示游戏结束信息
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        gameOver.innerHTML = `
            <h2>游戏结束</h2>
            <p>得分: ${this.score}</p>
            <button onclick="location.reload()">重新开始</button>
        `;
        gameOver.style.position = 'absolute';
        gameOver.style.left = '50%';
        gameOver.style.top = '50%';
        gameOver.style.transform = 'translate(-50%, -50%)';
        gameOver.style.background = 'white';
        gameOver.style.padding = '20px';
        gameOver.style.borderRadius = '10px';
        gameOver.style.textAlign = 'center';
        document.body.appendChild(gameOver);
    }

    stopGame() {
        clearInterval(this.gameLoop);
        this.stopAcceleration(); // 确保加速状态被清除
        document.removeEventListener('keydown', this.handleKeyPress);
    }

    // 添加开始加速方法
    startAcceleration() {
        this.isAccelerating = true;
        clearInterval(this.gameLoop);
        this.speed = this.baseSpeed / 2; // 速度加倍
        this.gameLoop = setInterval(this.update.bind(this), this.speed);
        
        // 添加视觉效果
        this.canvas.style.filter = 'brightness(1.2)'; // 提高亮度表示加速状态
        
        // 显示加速提示
        this.showSpecialEffect('加速中！');
    }

    // 添加停止加速方法
    stopAcceleration() {
        if (this.isAccelerating) {
            this.isAccelerating = false;
            clearInterval(this.gameLoop);
            this.speed = this.baseSpeed;
            this.gameLoop = setInterval(this.update.bind(this), this.speed);
            
            // 恢复正常视觉效果
            this.canvas.style.filter = 'none';
        }
    }

    // 在 SnakeGame 类中添加更新道具显示的方法
    updatePowerUpDisplay() {
        const powerupTypes = {
            '复活': 'revive',
            '减速': 'slow',
            '得分翻倍': 'double'
        };

        for (const [type, count] of Object.entries(this.powerUps)) {
            const elementId = `powerup-${powerupTypes[type]}`;
            const element = document.getElementById(elementId);
            if (element) {
                const oldValue = parseInt(element.textContent);
                element.textContent = count;
                
                // 添加数量变化动画
                if (oldValue !== count) {
                    element.classList.remove('changed');
                    void element.offsetWidth; // 触发重排
                    element.classList.add('changed');
                }
            }
        }
    }
} 