//=============================================================================
// DrawLineGame.js - 一笔画解谜游戏 v1.0
//=============================================================================
/*:
 * @plugindesc 一笔画解谜游戏
 * @author 定制版
 *
 * @param successSwitch
 * @text 成功开关ID
 * @desc 解谜成功后开启的全局开关
 * @type number
 * @default 1
 *
 * @param levels
 * @text 关卡数据
 * @desc JSON 数组，每个元素包含 nodes 和 edges。示例见帮助。
 * @type note
 * @default [{"nodes":[{"id":0,"x":200,"y":100},{"id":1,"x":100,"y":300},{"id":2,"x":300,"y":300}],"edges":[{"from":0,"to":1},{"from":1,"to":2},{"from":2,"to":0}]}]
 *
 * @help
 * ============================================================================
 * 插件命令
 * ============================================================================
 *   DrawLineStart [索引]   - 启动指定关卡（索引从0开始），不填则启动第0关
 *
 * ============================================================================
 * 关卡数据格式
 * ============================================================================
 * 在插件参数 "levels" 中填写 JSON 数组，每个关卡对象格式如下：
 * {
 *   "nodes": [
 *     { "id": 0, "x": 200, "y": 100 },
 *     { "id": 1, "x": 100, "y": 300 },
 *     ...
 *   ],
 *   "edges": [
 *     { "from": 0, "to": 1 },
 *     { "from": 1, "to": 2 },
 *     ...
 *   ]
 * }
 *
 * 注意：id 必须从 0 开始连续，坐标以屏幕像素为单位。
 */

var Imported = Imported || {};
Imported.DrawLineGame = true;

(function() {
    'use strict';

    //=========================================================================
    // 参数解析
    //=========================================================================
    const parameters = PluginManager.parameters('DrawLineGame');
    const SUCCESS_SWITCH = Number(parameters['successSwitch'] || 1);
    let LEVELS = [];
    try {
        LEVELS = JSON.parse(parameters['levels'] || '[{"nodes":[{"id":0,"x":200,"y":100},{"id":1,"x":100,"y":300},{"id":2,"x":300,"y":300}],"edges":[{"from":0,"to":1},{"from":1,"to":2},{"from":2,"to":0}]}]');
    } catch(e) {
        console.error('DrawLineGame: 关卡数据解析失败，使用默认关卡。', e);
        LEVELS = [{
            nodes: [{id:0,x:200,y:100},{id:1,x:100,y:300},{id:2,x:300,y:300}],
            edges: [{from:0,to:1},{from:1,to:2},{from:2,to:0}]
        }];
    }

    //=========================================================================
    // 图管理器
    //=========================================================================
    class GraphManager {
        constructor(nodes, edges) {
            this.nodes = nodes.slice();
            this.edges = edges.map(e => ({
                from: e.from,
                to: e.to,
                walked: false
            }));
            this.currentNode = null;   // 当前所在节点ID
            this.startNode = null;     // 起始节点ID（用于重置时恢复）
            this.history = [];         // 走过的边记录（备用）
        }

        reset() {
            this.edges.forEach(e => e.walked = false);
            this.currentNode = null;
            this.startNode = null;
            this.history = [];
        }

        // 获取连接两个节点且未走过的边
        getUnwalkedEdge(fromId, toId) {
            return this.edges.find(e =>
                !e.walked &&
                ((e.from === fromId && e.to === toId) || (e.to === fromId && e.from === toId))
            );
        }

        // 尝试移动到目标节点，成功则标记边并更新当前位置
        moveTo(targetId) {
            if (this.currentNode === null) {
                // 首次移动：只记录起点
                this.currentNode = targetId;
                this.startNode = targetId;
                return true;
            }

            const edge = this.getUnwalkedEdge(this.currentNode, targetId);
            if (edge) {
                edge.walked = true;
                this.history.push(edge);
                this.currentNode = targetId;
                return true;
            }
            return false;
        }

        // 检查是否所有边都已走过
        isAllEdgesWalked() {
            return this.edges.every(e => e.walked);
        }

        // 获取当前节点可用的未走过边（用于判断是否卡住）
        getAvailableEdges(nodeId) {
            return this.edges.filter(e =>
                !e.walked && (e.from === nodeId || e.to === nodeId)
            );
        }

        hasAvailableMove() {
            if (this.currentNode === null) return true;
            return this.getAvailableEdges(this.currentNode).length > 0;
        }

        // 获取所有边的绘制数据（包含坐标）
        getEdgeDrawData() {
            return this.edges.map(e => {
                const fromNode = this.nodes.find(n => n.id === e.from);
                const toNode = this.nodes.find(n => n.id === e.to);
                return {
                    from: fromNode,
                    to: toNode,
                    walked: e.walked
                };
            });
        }
    }

    //=========================================================================
    // 游戏场景
    //=========================================================================
    class Scene_DrawLine extends Scene_MenuBase {
        initialize(levelIndex = 0) {
            super.initialize();
            this._levelIndex = Math.min(levelIndex, LEVELS.length - 1);
            const levelData = LEVELS[this._levelIndex];
            this._graph = new GraphManager(levelData.nodes, levelData.edges);
            this._drawing = false;          // 是否正在划线（手指按下）
            this._gameOver = false;
            this._victory = false;
            this._nodeRadius = 30;          // 点击半径
        }

        create() {
            super.create();
            this.createBackground();
            this.createCanvas();
            this.createUI();
            this.drawAll();
        }

        createBackground() {
            // 半透明遮罩
            this._backSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
            this._backSprite.bitmap.fillAll('rgba(0, 0, 0, 0.6)');
            this.addChild(this._backSprite);
        }

        createCanvas() {
            this._canvasSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
            this.addChild(this._canvasSprite);
        }

        createUI() {
            // 提示文字
            this._hintSprite = new Sprite(new Bitmap(400, 40));
            this._hintSprite.bitmap.fontSize = 22;
            this._hintSprite.bitmap.textColor = '#ffffff';
            this._hintSprite.bitmap.outlineColor = '#000000';
            this._hintSprite.bitmap.outlineWidth = 3;
            this._hintSprite.bitmap.drawText('一笔画完所有线，点击节点开始', 0, 0, 400, 40, 'center');
            this._hintSprite.x = (Graphics.width - 400) / 2;
            this._hintSprite.y = 20;
            this.addChild(this._hintSprite);

            // 重置按钮
            this._resetBtn = new Sprite(new Bitmap(100, 40));
            this._resetBtn.bitmap.fillAll('#e74c3c');
            this._resetBtn.bitmap.fontSize = 20;
            this._resetBtn.bitmap.textColor = '#ffffff';
            this._resetBtn.bitmap.outlineColor = '#000000';
            this._resetBtn.bitmap.outlineWidth = 2;
            this._resetBtn.bitmap.drawText('重置', 0, 0, 100, 40, 'center');
            this._resetBtn.x = Graphics.width - 120;
            this._resetBtn.y = 20;
            this._resetBtn.interactive = true;
            this._resetBtn.on('pointerdown', () => this.resetGame());
            this.addChild(this._resetBtn);

            // 退出按钮
            this._exitBtn = new Sprite(new Bitmap(80, 40));
            this._exitBtn.bitmap.fillAll('#95a5a6');
            this._exitBtn.bitmap.fontSize = 20;
            this._exitBtn.bitmap.textColor = '#ffffff';
            this._exitBtn.bitmap.outlineColor = '#000000';
            this._exitBtn.bitmap.outlineWidth = 2;
            this._exitBtn.bitmap.drawText('退出', 0, 0, 80, 40, 'center');
            this._exitBtn.x = 20;
            this._exitBtn.y = 20;
            this._exitBtn.interactive = true;
            this._exitBtn.on('pointerdown', () => this.popScene());
            this.addChild(this._exitBtn);
        }

        resetGame() {
            this._graph.reset();
            this._drawing = false;
            this._gameOver = false;
            this._victory = false;
            this.drawAll();
        }

        // 获取点击位置所在的节点ID，未命中返回 null
        getNodeAt(tx, ty) {
            for (let node of this._graph.nodes) {
                const dx = tx - node.x;
                const dy = ty - node.y;
                if (Math.sqrt(dx*dx + dy*dy) < this._nodeRadius) {
                    return node.id;
                }
            }
            return null;
        }

        update() {
            super.update();
            if (this._gameOver) return;

            // ESC 退出
            if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                this.popScene();
                return;
            }

            this.handleTouch();
        }

        handleTouch() {
            // 手指按下
            if (TouchInput.isTriggered()) {
                const nodeId = this.getNodeAt(TouchInput.x, TouchInput.y);
                if (nodeId !== null) {
                    // 重置之前的状态（新的一笔）
                    this._graph.reset();
                    this._graph.moveTo(nodeId);
                    this._drawing = true;
                    this.drawAll();
                }
            }
            // 手指移动
            else if (TouchInput.isPressed() && this._drawing) {
                const nodeId = this.getNodeAt(TouchInput.x, TouchInput.y);
                if (nodeId !== null && nodeId !== this._graph.currentNode) {
                    // 尝试移动到新节点
                    if (this._graph.moveTo(nodeId)) {
                        this.drawAll();

                        // 检查胜利
                        if (this._graph.isAllEdgesWalked()) {
                            this._victory = true;
                            this._gameOver = true;
                            SoundManager.playSave();
                            this.onVictory();
                            return;
                        }

                        // 检查是否卡住（无路可走但还有边未画）
                        if (!this._graph.hasAvailableMove() && !this._graph.isAllEdgesWalked()) {
                            this._gameOver = true;
                            SoundManager.playBuzzer();
                            this.showFailure();
                            return;
                        }
                    }
                }
            }
            // 手指抬起
            else if (TouchInput.isReleased() && this._drawing) {
                this._drawing = false;
                this.drawAll();
            }
        }

        onVictory() {
            $gameSwitches.setValue(SUCCESS_SWITCH, true);
            // 显示成功信息并延迟退出
            const victorySprite = new Sprite(new Bitmap(300, 60));
            victorySprite.bitmap.fontSize = 32;
            victorySprite.bitmap.textColor = '#2ecc71';
            victorySprite.bitmap.outlineColor = '#000000';
            victorySprite.bitmap.outlineWidth = 4;
            victorySprite.bitmap.drawText('成功！', 0, 0, 300, 60, 'center');
            victorySprite.x = (Graphics.width - 300) / 2;
            victorySprite.y = Graphics.height / 2 - 30;
            victorySprite.z = 1000;
            this.addChild(victorySprite);

            setTimeout(() => this.popScene(), 1000);
        }

        showFailure() {
            const failSprite = new Sprite(new Bitmap(300, 60));
            failSprite.bitmap.fontSize = 32;
            failSprite.bitmap.textColor = '#e74c3c';
            failSprite.bitmap.outlineColor = '#000000';
            failSprite.bitmap.outlineWidth = 4;
            failSprite.bitmap.drawText('卡住了，重置再试', 0, 0, 300, 60, 'center');
            failSprite.x = (Graphics.width - 300) / 2;
            failSprite.y = Graphics.height / 2 - 30;
            failSprite.z = 1000;
            this.addChild(failSprite);

            // 5秒后自动隐藏
            setTimeout(() => {
                if (failSprite.parent) failSprite.parent.removeChild(failSprite);
            }, 2000);
        }

        drawAll() {
            const bitmap = this._canvasSprite.bitmap;
            const ctx = bitmap._context;
            bitmap.clear();

            // 1. 绘制所有边（未走过的灰色，走过的亮色）
            const edgeData = this._graph.getEdgeDrawData();
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            for (let e of edgeData) {
                ctx.beginPath();
                ctx.moveTo(e.from.x, e.from.y);
                ctx.lineTo(e.to.x, e.to.y);
                ctx.strokeStyle = e.walked ? '#2ecc71' : '#7f8c8d';
                ctx.stroke();
            }

            // 2. 绘制节点
            for (let node of this._graph.nodes) {
                const isCurrent = (node.id === this._graph.currentNode);
                // 外圈（选中高亮）
                if (isCurrent) {
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 主体
                ctx.fillStyle = '#3498db';
                ctx.beginPath();
                ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();

                // 节点编号
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.id, node.x, node.y);
            }

            bitmap._setDirty();
        }
    }

    //=========================================================================
    // 插件命令
    //=========================================================================
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'DrawLineStart') {
            const levelIndex = args[0] ? parseInt(args[0]) : 0;
            SceneManager.push(Scene_DrawLine.bind(this, levelIndex));
        }
    };

})();