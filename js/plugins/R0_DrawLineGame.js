//=============================================================================
// R0_DrawLineGame.js - 一笔画解谜游戏（简化版）
//=============================================================================
/*:
 * @plugindesc 一笔画解谜游戏（简化版）
 * @author 定制版
 *
 * @param successSwitch
 * @text 成功开关ID
 * @desc 解谜成功后开启的全局开关
 * @type number
 * @default 1
 *
 *
 * @help
 * 插件命令：
 *   DrawLineStart [关卡索引] - 启动指定关卡（从0开始）
 *
 * 关卡说明：
 *   0: 八边形八卦阵
 *   1: 正方形交叉
 *   2: 三角形网格
 *   3: 五角星形
 *   4: 六角雪花
 *
 * 玩法说明：
 *   1. 点击任意节点开始游戏
 *   2. 从一个节点拖拽到另一个节点绘制连线
 *   3. 目标是用一条连续的线连接所有边
 *   4. 每个边只能走一次
 *   5. 使用"撤回"按钮可以撤销上一步
 */

var Imported = Imported || {};
Imported.DrawLineGame = true;

(function() {
    'use strict';

    const parameters = PluginManager.parameters('R0_DrawLineGame');
    const SUCCESS_SWITCH = Number(parameters['successSwitch'] || 1);
    const DEBUG_MODE = 'false';
    const ENABLE_PARTICLE = 'false';

    // 预加载背景图片
    const BACKGROUND_IMAGE = 'OneLineBG';
    let backgroundBitmap = null;
    let backgroundLoaded = false;
    
    // 在游戏启动时预加载背景图片
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        // 预加载背景图片
        if (!backgroundBitmap) {
            backgroundBitmap = ImageManager.loadPicture(BACKGROUND_IMAGE);
            if (backgroundBitmap.isReady()) {
                backgroundLoaded = true;
            } else {
                // 添加加载监听器
                backgroundBitmap.addLoadListener(() => {
                    backgroundLoaded = true;
                });
            }
        }
    };

    // 中心点坐标
    const CENTER_X = 408;
    const CENTER_Y = 312;
    const RADIUS = 200; // 外接圆半径

    // 关卡数据
    const LEVELS = [
                { // 关卡3：五角星形（五边形）
            name: "五角星",
            description: "完美对称五角星",
            nodes: (() => {
                // 生成正五边形的5个顶点
                const nodes = [];
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 2 * Math.PI / 5) - Math.PI / 2; // 从顶部开始
                    nodes.push({
                        id: i,
                        x: CENTER_X + RADIUS * Math.cos(angle),
                        y: CENTER_Y + RADIUS * Math.sin(angle)
                    });
                }
                return nodes;
            })(),
            edges: [
                // 五角星的5个外顶点连线
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 0 },
                // 五角星的内部连线
                { from: 0, to: 2 },
                { from: 1, to: 3 },
                { from: 2, to: 4 },
                { from: 3, to: 0 },
                { from: 4, to: 1 }
            ]
        },

        { // 关卡1：正方形交叉
            name: "方形交叉",
            description: "正方形加两条对角线",
            nodes: [
                { id: 0, x: 258, y: 162 },  // 左上
                { id: 1, x: 558, y: 162 },  // 右上
                { id: 2, x: 258, y: 462 },  // 左下
                { id: 3, x: 558, y: 462 }   // 右下
            ],
            edges: [
                { from: 0, to: 1 },  // 上边
                { from: 1, to: 3 },  // 右边
                { from: 3, to: 2 },  // 下边
                { from: 2, to: 0 },  // 左边
                { from: 0, to: 3 },  // 主对角线
                { from: 1, to: 2 }   // 副对角线
            ]
        },
        { // 关卡2：三角形网格
            name: "三角网格",
            description: "内外三角形连接",
            nodes: [
                { id: 0, x: 408, y: 100 },  // 上顶点
                { id: 1, x: 200, y: 450 },  // 左下
                { id: 2, x: 616, y: 450 },  // 右下
                { id: 3, x: 408, y: 275 }   // 中心
            ],
            edges: [
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 0 },
                { from: 0, to: 3 },
                { from: 1, to: 3 },
                { from: 2, to: 3 }
            ]
        },
        { // 关卡4：六角雪花（六边形）
            name: "六角雪花",
            description: "复杂六边形雪花图案",
            nodes: (() => {
                const nodes = [];
                const innerRadius = RADIUS * 0.6; // 内六边形半径
                
                // 外六边形的6个顶点
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 2 * Math.PI / 6) - Math.PI / 2; // 从顶部开始
                    nodes.push({
                        id: i,
                        x: CENTER_X + RADIUS * Math.cos(angle),
                        y: CENTER_Y + RADIUS * Math.sin(angle)
                    });
                }
                
                // 内六边形的6个顶点
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
                    nodes.push({
                        id: 6 + i, // 内层节点ID从6开始
                        x: CENTER_X + innerRadius * Math.cos(angle),
                        y: CENTER_Y + innerRadius * Math.sin(angle)
                    });
                }
                
                return nodes;
            })(),
            edges: [
                // 外六边形边界
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 0 },
                
                // 内六边形边界
                { from: 6, to: 7 },
                { from: 7, to: 8 },
                { from: 8, to: 9 },
                { from: 9, to: 10 },
                { from: 10, to: 11 },
                { from: 11, to: 6 },
                
                // 外层到内层的连接（星形图案）
                { from: 0, to: 6 },
                { from: 0, to: 11 },
                
                { from: 1, to: 7 },
                { from: 1, to: 6 },
                
                { from: 2, to: 8 },
                { from: 2, to: 7 },
                
                { from: 3, to: 9 },
                { from: 3, to: 8 },
                
                { from: 4, to: 10 },
                { from: 4, to: 9 },
                
                { from: 5, to: 11 },
                { from: 5, to: 10 },
                
                // 内六边形的对角线
                { from: 6, to: 9 },
                { from: 7, to: 10 },
                { from: 8, to: 11 }
            ]
        }
    ];

    class GraphManager {
        constructor(nodes, edges) {
            this.nodes = nodes.slice();
            this.edges = edges.map(e => ({ 
                from: e.from, 
                to: e.to, 
                walked: false 
            }));
            this.currentNode = null;
            this.path = [];
            this.startTime = Date.now();
        }
        
        reset() { 
            this.edges.forEach(e => e.walked = false); 
            this.currentNode = null;
            this.path = [];
            this.startTime = Date.now();
        }
        
        moveTo(targetId) {
            if (this.currentNode === null) { 
                this.currentNode = targetId; 
                this.path.push(targetId);
                return true; 
            }
            
            if (this.currentNode === targetId) {
                return false; // 不能移动到当前节点
            }
            
            const edge = this.edges.find(e => 
                !e.walked && 
                ((e.from === this.currentNode && e.to === targetId) || 
                 (e.to === this.currentNode && e.from === targetId))
            );
            
            if (edge) { 
                edge.walked = true; 
                this.currentNode = targetId;
                this.path.push(targetId);
                return true; 
            }
            return false;
        }
        
        isAllEdgesWalked() { 
            return this.edges.every(e => e.walked); 
        }
        
        hasAvailableMove() {
            if (this.currentNode === null) return true;
            return this.edges.some(e => !e.walked && (e.from === this.currentNode || e.to === this.currentNode));
        }
        
        getEdgeDrawData() {
            return this.edges.map(e => ({ 
                from: this.nodes.find(n => n.id === e.from), 
                to: this.nodes.find(n => n.id === e.to), 
                walked: e.walked 
            }));
        }
        
        undo() {
            if (this.path.length <= 1) {
                this.reset();
                return false;
            }
            
            this.path.pop();
            this.currentNode = this.path[this.path.length - 1] || null;
            
            this.edges.forEach(e => e.walked = false);
            for (let i = 0; i < this.path.length - 1; i++) {
                const from = this.path[i];
                const to = this.path[i + 1];
                const edge = this.edges.find(e => 
                    (e.from === from && e.to === to) || 
                    (e.from === to && e.to === from)
                );
                if (edge) edge.walked = true;
            }
            
            return true;
        }
        
        getTimeElapsed() {
            return Math.floor((Date.now() - this.startTime) / 1000);
        }
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    class Scene_DrawLine extends Scene_MenuBase {
        initialize(levelIndex = 0) {
            super.initialize();
            this._levelIndex = Math.min(levelIndex, LEVELS.length - 1);
            this._levelData = LEVELS[this._levelIndex];
            this._graph = new GraphManager(this._levelData.nodes, this._levelData.edges);
            this._drawing = false;
            this._gameOver = false;
            this._nodeRadius = 30;
            this._needRedraw = true;
            this._selectedNode = null;
            this._buttonAreas = []; // 存储按钮点击区域
        }

        create() {
            super.create();
            this.createBackground();
            this.createCanvas();
            this.createUI();
            this.drawAll();
        }

        createBackground() {
            // 如果之前已经预加载了背景图片，直接使用
            if (backgroundBitmap && backgroundBitmap.isReady()) {
                this._background = new Sprite(backgroundBitmap);
                this._background.scale.x = Graphics.width / backgroundBitmap.width;
                this._background.scale.y = Graphics.height / backgroundBitmap.height;
            } else {
                // 如果背景图片还没加载，创建一个占位背景
                const fallback = new Bitmap(Graphics.width, Graphics.height);
                fallback.fillAll('#2c3e50'); // 深蓝色背景
                this._background = new Sprite(fallback);
                
                // 尝试加载背景图片
                const bgBitmap = ImageManager.loadPicture(BACKGROUND_IMAGE);
                if (!bgBitmap.isReady() && !bgBitmap.isError()) {
                    // 图片正在加载，添加加载监听器
                    bgBitmap.addLoadListener(() => {
                        if (this._background) {
                            this._background.bitmap = bgBitmap;
                            this._background.scale.x = Graphics.width / bgBitmap.width;
                            this._background.scale.y = Graphics.height / bgBitmap.height;
                        }
                    });
                } else if (bgBitmap.isReady()) {
                    // 图片已加载完成
                    this._background.bitmap = bgBitmap;
                    this._background.scale.x = Graphics.width / bgBitmap.width;
                    this._background.scale.y = Graphics.height / bgBitmap.height;
                }
            }
            
            this.addChild(this._background);
        }

        createCanvas() {
            this._canvasSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
            this._canvasSprite.z = 0; // 画布在背景之上
            this.addChild(this._canvasSprite);
        }

        createUI() {
            // 清空按钮区域
            this._buttonAreas = [];
            
            // 标题
            const hintWidth = 600;
            const hintHeight = 40;
            this._hintSprite = new Sprite(new Bitmap(hintWidth, hintHeight));
            this._hintSprite.bitmap.fontSize = 24;
            this._hintSprite.bitmap.textColor = '#ffffff';
            this._hintSprite.bitmap.outlineColor = '#000000';
            this._hintSprite.bitmap.outlineWidth = 3;
            
            const levelName = this._levelData.name;
            const levelDesc = this._levelData.description ? ` - ${this._levelData.description}` : '';
            this._hintSprite.bitmap.drawText(`关卡 ${this._levelIndex+1}: ${levelName}${levelDesc}`, 0, 0, hintWidth, hintHeight, 'center');
            this._hintSprite.x = (Graphics.width - hintWidth) / 2;
            this._hintSprite.y = 10;
            this._hintSprite.z = 2; // UI在画布之上
            this.addChild(this._hintSprite);
            
            // 游戏提示
            this._gameHint = new Sprite(new Bitmap(600, 30));
            this._gameHint.bitmap.fontSize = 18;
            this._gameHint.bitmap.textColor = '#f1c40f';
            this._gameHint.bitmap.drawText('点击节点开始，然后点击另一个节点绘制连线', 0, 0, 600, 30, 'center');
            this._gameHint.x = (Graphics.width - 600) / 2;
            this._gameHint.y = 50;
            this._gameHint.z = 2;
            this.addChild(this._gameHint);
            
            // 控制按钮（只保留右上角的重置和退出按钮）
            this.createControlButtons();
            
            // 调试信息
            if (DEBUG_MODE) {
                this._debugSprite = new Sprite(new Bitmap(300, 120));
                this._debugSprite.bitmap.fontSize = 12;
                this._debugSprite.bitmap.textColor = '#ffff00';
                this._debugSprite.x = 20;
                this._debugSprite.y = Graphics.height - 140;
                this._debugSprite.z = 2;
                this.addChild(this._debugSprite);
            }
        }
        
        createControlButtons() {
            const buttonWidth = 100;
            const buttonHeight = 40;
            const buttonSpacing = 10;
            
            // 重置按钮
            this._resetBtn = this.createButton('重置', Graphics.width - buttonWidth * 2 - buttonSpacing, 20, buttonWidth, buttonHeight, '#e74c3c', () => this.resetGame());
            
            // 退出按钮
            this._exitBtn = this.createButton('退出', Graphics.width - buttonWidth, 20, buttonWidth, buttonHeight, '#95a5a6', () => this.popScene());
        }
        
        createButton(text, x, y, width, height, color, callback) {
            const button = new Sprite(new Bitmap(width, height));
            button.bitmap.fillAll(color);
            button.bitmap.fontSize = 20;
            button.bitmap.textColor = '#ffffff';
            button.bitmap.outlineColor = '#000000';
            button.bitmap.outlineWidth = 2;
            button.bitmap.drawText(text, 0, 0, width, height, 'center');
            button.x = x;
            button.y = y;
            button.z = 3; // 按钮在UI最上层
            
            // 记录按钮区域用于点击检测
            this._buttonAreas.push({
                x: x,
                y: y,
                width: width,
                height: height,
                callback: callback
            });
            
            this.addChild(button);
            return button;
        }
        
        resetGame() {
            this._graph.reset();
            this._drawing = false;
            this._gameOver = false;
            this._selectedNode = null;
            this._needRedraw = true;
            this.drawAll();
            SoundManager.playCursor();
            
            if (this._messageSprite && this._messageSprite.parent) {
                this._messageSprite.parent.removeChild(this._messageSprite);
            }
        }
        
        update() {
            super.update();
            
            if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                this.popScene();
                return;
            }
            
            this.handleTouch();
            
            if (DEBUG_MODE && this._debugSprite) {
                this.updateDebugInfo();
            }
            
            if (this._needRedraw) {
                this.drawAll();
                this._needRedraw = false;
            }
            
            this.updateInput();
        }
        
        // 处理鼠标和触摸输入
        updateInput() {
            if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
                const tx = TouchInput.x || Input.x;
                const ty = TouchInput.y || Input.y;
                
                // 检查是否点击了按钮
                for (const buttonArea of this._buttonAreas) {
                    if (this.isPointInButton(tx, ty, buttonArea)) {
                        buttonArea.callback();
                        return;
                    }
                }
            }
        }
        
        isPointInButton(x, y, buttonArea) {
            return x >= buttonArea.x && 
                   x <= buttonArea.x + buttonArea.width && 
                   y >= buttonArea.y && 
                   y <= buttonArea.y + buttonArea.height;
        }
        
        updateDebugInfo() {
            const bitmap = this._debugSprite.bitmap;
            bitmap.clear();
            
            const walkedEdges = this._graph.edges.filter(e => e.walked).length;
            const totalEdges = this._graph.edges.length;
            const elapsedTime = this._graph.getTimeElapsed();
            
            let info = [];
            info.push(`关卡: ${this._levelData.name}`);
            info.push(`节点数: ${this._graph.nodes.length}`);
            info.push(`边数: ${totalEdges}`);
            info.push(`当前节点: ${this._graph.currentNode !== null ? this._graph.currentNode : '无'}`);
            info.push(`路径长度: ${this._graph.path.length}`);
            info.push(`已走边: ${walkedEdges}/${totalEdges}`);
            info.push(`游戏时间: ${elapsedTime}秒`);
            
            bitmap.drawText(info.join('\n'), 0, 0, 300, 120, 'left');
        }
        
        getNodeAt(tx, ty) {
            for (let node of this._graph.nodes) {
                if (Math.hypot(tx - node.x, ty - node.y) < this._nodeRadius) {
                    return node.id;
                }
            }
            return null;
        }
        
        handleTouch() {
            if (this._gameOver) return;
            
            const tx = TouchInput.x, ty = TouchInput.y;
            
            if (TouchInput.isTriggered()) {
                // 检查是否点击了按钮
                for (const buttonArea of this._buttonAreas) {
                    if (this.isPointInButton(tx, ty, buttonArea)) {
                        return; // 点击了按钮，不处理节点
                    }
                }
                
                const nodeId = this.getNodeAt(tx, ty);
                if (nodeId !== null) {
                    this._selectedNode = nodeId;
                    
                    if (this._graph.currentNode === null) {
                        // 开始游戏
                        this._graph.moveTo(nodeId);
                        this._drawing = false; // 不再需要拖拽模式
                        this._gameOver = false;
                        this._needRedraw = true;
                        SoundManager.playCursor();
                    } else if (nodeId !== this._graph.currentNode) {
                        // 尝试移动到另一个节点
                        if (this._graph.moveTo(nodeId)) {
                            this._needRedraw = true;
                            SoundManager.playCursor();
                            
                            if (this._graph.isAllEdgesWalked()) {
                                this._gameOver = true;
                                this._drawing = false;
                                SoundManager.playSave();
                                this.onVictory();
                                return;
                            }
                            
                            if (!this._graph.hasAvailableMove()) {
                                this._gameOver = true;
                                this._drawing = false;
                                SoundManager.playBuzzer();
                                this.showFailure("无路可走，重置再试");
                                return;
                            }
                        } else {
                            SoundManager.playBuzzer();
                        }
                    }
                }
            }
        }
        
        onVictory() {
            $gameSwitches.setValue(SUCCESS_SWITCH, true);
            console.log("一笔画游戏成功！修改开关：%d 的值为true", SUCCESS_SWITCH)
            
            this._messageSprite = new Sprite(new Bitmap(500, 100));
            this._messageSprite.bitmap.fontSize = 40;
            this._messageSprite.bitmap.textColor = '#2ecc71';
            this._messageSprite.bitmap.outlineColor = '#000000';
            this._messageSprite.bitmap.outlineWidth = 4;
            
            const elapsedTime = this._graph.getTimeElapsed();
            const victoryText = `恭喜通关！用时:${this._graph.formatTime(elapsedTime)}`;
            this._messageSprite.bitmap.drawText(victoryText, 0, 0, 500, 100, 'center');
            this._messageSprite.x = (Graphics.width - 500) / 2;
            this._messageSprite.y = Graphics.height / 2 - 50;
            this._messageSprite.z = 1000;
            this.addChild(this._messageSprite);
            
            // 显示烟花效果
            if (ENABLE_PARTICLE) {
                this.showFireworks();
            }
            
            // 3秒后返回地图
            setTimeout(() => {
                if (this._messageSprite && this._messageSprite.parent) {
                    this._messageSprite.parent.removeChild(this._messageSprite);
                }
                this.popScene();
            }, 3000);
        }
        
        showFireworks() {
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const x = 100 + Math.random() * (Graphics.width - 200);
                    const y = 100 + Math.random() * (Graphics.height - 200);
                    this.createFirework(x, y);
                }, i * 300);
            }
        }
        
        createFirework(x, y) {
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12;
                const particle = new Sprite(new Bitmap(4, 4));
                particle.bitmap.fillAll(color);
                particle.x = x;
                particle.y = y;
                particle.speedX = Math.cos(angle) * 5;
                particle.speedY = Math.sin(angle) * 5;
                particle.opacity = 1;
                particle.z = 2000;
                this.addChild(particle);
                
                // 粒子动画
                const animate = () => {
                    particle.x += particle.speedX;
                    particle.y += particle.speedY;
                    particle.speedX *= 0.95;
                    particle.speedY *= 0.95;
                    particle.opacity -= 0.05;
                    
                    if (particle.opacity > 0) {
                        requestAnimationFrame(animate);
                    } else if (particle.parent) {
                        particle.parent.removeChild(particle);
                    }
                };
                animate();
            }
        }
        
        showFailure(message) {
            this._messageSprite = new Sprite(new Bitmap(400, 60));
            this._messageSprite.bitmap.fontSize = 28;
            this._messageSprite.bitmap.textColor = '#e74c3c';
            this._messageSprite.bitmap.outlineColor = '#000000';
            this._messageSprite.bitmap.outlineWidth = 4;
            this._messageSprite.bitmap.drawText(message, 0, 0, 400, 60, 'center');
            this._messageSprite.x = (Graphics.width - 400) / 2;
            this._messageSprite.y = Graphics.height / 2 - 30;
            this._messageSprite.z = 1000;
            this.addChild(this._messageSprite);
            
            setTimeout(() => { 
                if (this._messageSprite && this._messageSprite.parent) {
                    this._messageSprite.parent.removeChild(this._messageSprite);
                }
            }, 2000);
        }
        
        drawAll() {
            const bitmap = this._canvasSprite.bitmap;
            const ctx = bitmap._context;
            bitmap.clear();
            
            // 绘制边
            this.drawEdges(ctx);
            
            // 绘制节点
            this.drawNodes(ctx);
            
            bitmap._setDirty();
        }
        
        drawEdges(ctx) {
            const edgeData = this._graph.getEdgeDrawData();
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            for (let e of edgeData) {
                if (!e.from || !e.to) continue;
                
                ctx.beginPath();
                ctx.moveTo(e.from.x, e.from.y);
                ctx.lineTo(e.to.x, e.to.y);
                ctx.strokeStyle = e.walked ? '#2ecc71' : '#f1c40f';
                ctx.stroke();
            }
        }
        
        drawNodes(ctx) {
            for (let node of this._graph.nodes) {
                const isCurrent = (node.id === this._graph.currentNode);
                const isInPath = this._graph.path.includes(node.id);
                
                // 绘制节点外圈
                if (isCurrent) {
                    ctx.fillStyle = '#f1c40f'; // 当前节点，黄色
                } else if (isInPath) {
                    ctx.fillStyle = '#2ecc71'; // 已访问节点，绿色
                } else {
                    ctx.fillStyle = '#3498db'; // 未访问节点，蓝色
                }
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制节点内圈
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制节点边框
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // 绘制节点编号
                ctx.fillStyle = '#2c3e50';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.id, node.x, node.y);
            }
        }
    }

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'DrawLineStart') {
            const levelIndex = args[0] ? parseInt(args[0]) : 0;
            SceneManager.push(Scene_DrawLine.bind(this, levelIndex));
        }
    };
})();