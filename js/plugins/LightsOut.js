//=============================================================================
// LightsOut.js - 点灯小游戏插件 v1.1 (修复点击问题)
//=============================================================================
/*:
 * @plugindesc 点灯解谜游戏 (修复点击)
 * @author 定制版
 *
 * @param rows
 * @text 行数
 * @desc 游戏网格的行数
 * @type number
 * @default 5
 *
 * @param cols
 * @text 列数
 * @desc 游戏网格的列数
 * @type number
 * @default 5
 *
 * @param winSwitch
 * @text 胜利开关ID
 * @desc 解谜成功后开启的全局开关
 * @type number
 * @default 1
 *
 * @param shuffleMoves
 * @text 随机打乱步数
 * @desc 初始随机点击多少次来打乱灯的状态
 * @type number
 * @default 20
 *
 * @param targetState
 * @text 目标状态
 * @desc 胜利条件是全部点亮(true)还是全部熄灭(false)
 * @type boolean
 * @default true
 *
 * @param cellSize
 * @text 格子尺寸
 * @desc 每个格子的大小(像素)
 * @type number
 * @default 80
 *
 * @param seClick
 * @text 点击音效
 * @desc 点击格子时播放的音效名称
 * @default cursor
 *
 * @param seWin
 * @text 胜利音效
 * @desc 胜利时播放的音效名称
 * @default save
 *
 * @help
 * 插件命令：LightsOutStart
 */

var Imported = Imported || {};
Imported.LightsOut = true;

(function() {
    'use strict';

    const parameters = PluginManager.parameters('LightsOut');
    const DEFAULT_ROWS = Number(parameters['rows'] || 5);
    const DEFAULT_COLS = Number(parameters['cols'] || 5);
    const WIN_SWITCH = Number(parameters['winSwitch'] || 1);
    const DEFAULT_SHUFFLE = Number(parameters['shuffleMoves'] || 20);
    const DEFAULT_TARGET = parameters['targetState'] === 'true' ? true : (parameters['targetState'] === 'false' ? false : true);
    const CELL_SIZE = Number(parameters['cellSize'] || 80);
    const SE_CLICK = String(parameters['seClick'] || 'cursor');
    const SE_WIN = String(parameters['seWin'] || 'save');

    //=========================================================================
    // 游戏核心逻辑（与之前相同，略）
    //=========================================================================
    class LightsOutGame {
        constructor(rows, cols, targetState = true) {
            this._rows = rows;
            this._cols = cols;
            this._targetState = targetState;
            this._grid = [];
            this.initGrid();
        }
        initGrid() {
            this._grid = [];
            for (let r = 0; r < this._rows; r++) {
                const row = [];
                for (let c = 0; c < this._cols; c++) row.push(!this._targetState);
                this._grid.push(row);
            }
        }
        getState(row, col) {
            if (row < 0 || row >= this._rows || col < 0 || col >= this._cols) return null;
            return this._grid[row][col];
        }
        toggleCell(row, col) {
            if (row >= 0 && row < this._rows && col >= 0 && col < this._cols) {
                this._grid[row][col] = !this._grid[row][col];
            }
        }
        press(row, col) {
            this.toggleCell(row, col);
            this.toggleCell(row - 1, col);
            this.toggleCell(row + 1, col);
            this.toggleCell(row, col - 1);
            this.toggleCell(row, col + 1);
        }
        shuffle(moves) {
            for (let i = 0; i < moves; i++) {
                const r = Math.floor(Math.random() * this._rows);
                const c = Math.floor(Math.random() * this._cols);
                this.press(r, c);
            }
        }
        isWin() {
            for (let r = 0; r < this._rows; r++)
                for (let c = 0; c < this._cols; c++)
                    if (this._grid[r][c] !== this._targetState) return false;
            return true;
        }
        reset(shuffleMoves) { this.initGrid(); this.shuffle(shuffleMoves); }
    }

    //=========================================================================
    // 游戏场景
    //=========================================================================
    class Scene_LightsOut extends Scene_MenuBase {
        initialize(rows, cols, shuffleMoves, targetState) {
            super.initialize();
            this._rows = rows || DEFAULT_ROWS;
            this._cols = cols || DEFAULT_COLS;
            this._shuffleMoves = shuffleMoves !== undefined ? shuffleMoves : DEFAULT_SHUFFLE;
            this._targetState = targetState !== undefined ? targetState : DEFAULT_TARGET;
            this._game = new LightsOutGame(this._rows, this._cols, this._targetState);
            this._game.reset(this._shuffleMoves);
            this._cellSprites = [];
            this._gameOver = false;
        }

        create() {
            super.create();
            this.createBackground();
            this.createGrid();
            this.createUI();
            this.updateAllCells();
        }

        createBackground() {
            this._background = new Sprite(new Bitmap(Graphics.width, Graphics.height));
            this._background.bitmap.fillAll('#1a1a2e');
            this.addChild(this._background);
        }

        createGrid() {
            const gridWidth = this._cols * CELL_SIZE;
            const gridHeight = this._rows * CELL_SIZE;
            const startX = (Graphics.width - gridWidth) / 2;
            const startY = (Graphics.height - gridHeight) / 2;

            for (let r = 0; r < this._rows; r++) {
                const rowSprites = [];
                for (let c = 0; c < this._cols; c++) {
                    const spr = new Sprite(this.createCellBitmap(false));
                    spr.x = startX + c * CELL_SIZE;
                    spr.y = startY + r * CELL_SIZE;
                    spr.anchor.set(0, 0);
                    // 关键修复：确保交互开启
                    spr.interactive = true;
                    spr.buttonMode = true;
                    spr.on('pointerdown', () => this.onCellClick(r, c));
                    this.addChild(spr);
                    rowSprites.push(spr);
                }
                this._cellSprites.push(rowSprites);
            }
        }

        createCellBitmap(state) {
            const bmp = new Bitmap(CELL_SIZE, CELL_SIZE);
            const ctx = bmp._context;
            ctx.fillStyle = state ? '#f1c40f' : '#2c3e50';
            ctx.fillRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
            if (state) {
                ctx.fillStyle = '#f39c12';
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(CELL_SIZE/2, CELL_SIZE/2, CELL_SIZE/4, 0, Math.PI*2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            return bmp;
        }

        updateCellSprite(row, col, state) {
            const spr = this._cellSprites[row][col];
            if (spr) spr.bitmap = this.createCellBitmap(state);
        }

        updateAllCells() {
            for (let r = 0; r < this._rows; r++)
                for (let c = 0; c < this._cols; c++)
                    this.updateCellSprite(r, c, this._game.getState(r, c));
        }

        onCellClick(row, col) {
            if (this._gameOver) return;
            this._game.press(row, col);
            SoundManager.playSe({ name: SE_CLICK, volume: 80, pitch: 100 });
            this.updateAllCells();
            if (this._game.isWin()) {
                this._gameOver = true;
                SoundManager.playSe({ name: SE_WIN, volume: 90, pitch: 100 });
                $gameSwitches.setValue(WIN_SWITCH, true);
                this.showVictory();
            }
        }

        createUI() {
            const title = new Sprite(new Bitmap(200, 40));
            title.bitmap.fontSize = 24;
            title.bitmap.textColor = '#ecf0f1';
            title.bitmap.drawText('点灯游戏', 0, 0, 200, 40, 'center');
            title.x = (Graphics.width - 200) / 2;
            title.y = 20;
            this.addChild(title);

            const goalText = this._targetState ? '目标：全部点亮' : '目标：全部熄灭';
            const goal = new Sprite(new Bitmap(200, 30));
            goal.bitmap.fontSize = 18;
            goal.bitmap.textColor = '#bdc3c7';
            goal.bitmap.drawText(goalText, 0, 0, 200, 30, 'center');
            goal.x = (Graphics.width - 200) / 2;
            goal.y = 65;
            this.addChild(goal);

            // 重置按钮
            const resetBtn = new Sprite(this.createButtonBitmap('重置', 100, 40, '#e67e22'));
            resetBtn.x = 20;
            resetBtn.y = Graphics.height - 60;
            resetBtn.interactive = true;
            resetBtn.buttonMode = true;
            resetBtn.on('pointerdown', () => this.resetGame());
            this.addChild(resetBtn);

            // 退出按钮
            const exitBtn = new Sprite(this.createButtonBitmap('退出', 100, 40, '#95a5a6'));
            exitBtn.x = Graphics.width - 120;
            exitBtn.y = Graphics.height - 60;
            exitBtn.interactive = true;
            exitBtn.buttonMode = true;
            exitBtn.on('pointerdown', () => this.popScene());
            this.addChild(exitBtn);

            // 将 UI 层级提高
            [title, goal, resetBtn, exitBtn].forEach(s => s.z = 10);
        }

        createButtonBitmap(text, width, height, color) {
            const bmp = new Bitmap(width, height);
            const ctx = bmp._context;
            ctx.fillStyle = color;
            ctx.fillRect(2, 2, width - 4, height - 4);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, width - 2, height - 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width/2, height/2);
            return bmp;
        }

        resetGame() {
            this._game.reset(this._shuffleMoves);
            this._gameOver = false;
            this.updateAllCells();
            SoundManager.playSe({ name: SE_CLICK, volume: 80, pitch: 100 });
        }

        showVictory() {
            const victory = new Sprite(new Bitmap(300, 60));
            victory.bitmap.fontSize = 36;
            victory.bitmap.textColor = '#2ecc71';
            victory.bitmap.outlineColor = '#000000';
            victory.bitmap.outlineWidth = 4;
            victory.bitmap.drawText('胜利！', 0, 0, 300, 60, 'center');
            victory.x = (Graphics.width - 300) / 2;
            victory.y = Graphics.height / 2 - 30;
            victory.z = 100;
            this.addChild(victory);
            setTimeout(() => this.popScene(), 1500);
        }

        update() {
            super.update();
            if (Input.isTriggered('cancel')) this.popScene();
        }
    }

    //=========================================================================
    // 插件命令
    //=========================================================================
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'LightsOutStart') {
            if (args.length >= 4) {
                const rows = parseInt(args[0]);
                const cols = parseInt(args[1]);
                const shuffle = parseInt(args[2]);
                const target = args[3].toLowerCase() === 'true';
                SceneManager.push(Scene_LightsOut.bind(this, rows, cols, shuffle, target));
            } else {
                SceneManager.push(Scene_LightsOut.bind(this, DEFAULT_ROWS, DEFAULT_COLS, DEFAULT_SHUFFLE, DEFAULT_TARGET));
            }
        }
    };

})();