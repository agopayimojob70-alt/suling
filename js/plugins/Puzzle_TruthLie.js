//=============================================================================
// Puzzle_TruthLie.js (终极修复版 - 解决卡死与缩放冲突)
//=============================================================================
/*:
 * @plugindesc [v1.2] 真假格解谜 (修复解谜后移动锁定与缩放失效)
 * @param TargetSwitch
 * @desc 解谜成功后要开启的全局开关 ID
 * @default 1
 */

(function() {
    var parameters = PluginManager.parameters('Puzzle_TruthLie');
    var targetSwitch = Number(parameters['TargetSwitch'] || 1);

    var currentPuzzleState = [false, false, false, false];
    var targetAnswer = [false, true, false, true];

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'PuzzleOpen') {
            SceneManager.push(Scene_PuzzleTruthLie);
        }
    };

    function Scene_PuzzleTruthLie() { this.initialize.apply(this, arguments); }
    Scene_PuzzleTruthLie.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_PuzzleTruthLie.prototype.constructor = Scene_PuzzleTruthLie;

    Scene_PuzzleTruthLie.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWhiteBackground();
        this._window = new Window_PuzzleTruthLie();
        this._window.setHandler('ok', this.onSelect.bind(this));
        this._window.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._window);
    };

    Scene_PuzzleTruthLie.prototype.createWhiteBackground = function() {
        this._whiteBack = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._whiteBack.bitmap.fillAll('white');
        this.addChildAt(this._whiteBack, 0);
    };

    Scene_PuzzleTruthLie.prototype.onSelect = function() {
        var index = this._window.index();
        if (index < 4) {
            currentPuzzleState[index] = !currentPuzzleState[index];
            SoundManager.playCursor();
            this._window.refresh();
            this._window.activate();
        } else if (index >= 4 && index <= 7) {
            currentPuzzleState[index - 4] = !currentPuzzleState[index - 4];
            SoundManager.playCursor();
            this._window.refresh();
            this._window.activate();
        } else {
            this.checkAnswer();
        }
    };

    Scene_PuzzleTruthLie.prototype.checkAnswer = function() {
        var isCorrect = true;
        for (var i = 0; i < 4; i++) {
            if (currentPuzzleState[i] !== targetAnswer[i]) isCorrect = false;
        }

        if (isCorrect) {
            this.executeWinLogic();
        } else {
            SoundManager.playBuzzer();
            this._window.activate();
        }
    };

    // --- 【核心修复】解决卡死与缩放 ---
    Scene_PuzzleTruthLie.prototype.executeWinLogic = function() {
        SoundManager.playOk();
        
        // 1. 强制设置缩放目标（确保回到地图立刻开始放大）
        if ($gameScreen && $gameScreen.setZoom) {
            $gameScreen.setZoom(2.0); 
        }

        // 2. 开启成功开关
        $gameSwitches.setValue(targetSwitch, true);

        // 3. 【防卡死】解除玩家移动锁定，清除点击残余
        if ($gamePlayer) {
            $gamePlayer._moveRouteForcing = false;
            $gameTemp.clearDestination();
        }

        // 4. 退出
        this.popScene();
    };

    // --- 窗口部分 ---
    function Window_PuzzleTruthLie() { this.initialize.apply(this, arguments); }
    Window_PuzzleTruthLie.prototype = Object.create(Window_Selectable.prototype);
    Window_PuzzleTruthLie.prototype.constructor = Window_PuzzleTruthLie;

    Window_PuzzleTruthLie.prototype.initialize = function() {
        var w = 400, h = 300;
        var x = (Graphics.boxWidth - w) / 2;
        var y = (Graphics.boxHeight - h) / 2;
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this.refresh();
        this.select(8); // 默认选在“确认”按钮上
        this.activate();
    };

    Window_PuzzleTruthLie.prototype.maxItems = function() { return 9; };
    Window_PuzzleTruthLie.prototype.maxCols = function() { return 4; };

    Window_PuzzleTruthLie.prototype.itemRect = function(index) {
        var rect = new Rectangle();
        var maxCols = 4;
        rect.width = (this.width - this.padding * 2) / maxCols;
        rect.height = 70;
        
        if (index < 8) {
            rect.x = (index % maxCols) * rect.width;
            rect.y = Math.floor(index / maxCols) * 80;
        } else {
            rect.x = 0;
            rect.y = 180;
            rect.width = this.width - this.padding * 2;
        }
        return rect;
    };

    Window_PuzzleTruthLie.prototype.drawItem = function(index) {
        var rect = this.itemRect(index);
        this.contents.fontSize = 28;
        if (index < 4) {
            this.changeTextColor(this.systemColor());
            this.drawText(index + 1, rect.x, rect.y, rect.width, 'center');
        } else if (index >= 4 && index <= 7) {
            var val = currentPuzzleState[index - 4];
            this.changeTextColor(val ? this.textColor(24) : this.textColor(2)); 
            this.drawText(val ? "真" : "假", rect.x, rect.y, rect.width, 'center');
        } else {
            this.changeTextColor(this.normalColor());
            this.drawText("— 确认判定 —", rect.x, rect.y, rect.width, 'center');
        }
    };
})();