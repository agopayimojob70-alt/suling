//=============================================================================
// Puzzle_SwitchItem.js (最终功能增强版 - 增加退出按钮)
//=============================================================================

/*:
 * @plugindesc [v2.0] 四格转动解谜 - 增加退出按钮
 * @author Gemini
 * @help 
 * 插件指令: 
 * SpinPuzzle 公共事件ID
 * 示例: SpinPuzzle 1
 * * 按钮逻辑：
 * 第1-4格：切换拼图图片
 * 第5格：确认答案（正确则缩放并触发事件，错误弹出提示）
 * 第6格：退出（直接关闭解谜界面返回地图）
 */

(function() {
    var rewardCommonEventId = 0;
    var currentIndices = [0, 0, 0, 0];
    var targetAnswer = [0, 1, 2, 3]; // 可以在这里修改正确答案

    // --- 插件指令注册 ---
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'SpinPuzzle') {
            rewardCommonEventId = Number(args[0] || 0);
            currentIndices = [0, 0, 0, 0]; 
            SceneManager.push(Scene_PuzzleSwitch);
        }
    };

    // --- 场景类定义 ---
    function Scene_PuzzleSwitch() { this.initialize.apply(this, arguments); }
    Scene_PuzzleSwitch.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_PuzzleSwitch.prototype.constructor = Scene_PuzzleSwitch;

    Scene_PuzzleSwitch.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createBackground();
        this.createWindowLayer();
        this._window = new Window_PuzzleControl();
        this._window.setHandler('ok', this.onSelectOk.bind(this));
        this._window.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._window);
    };

    Scene_PuzzleSwitch.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = new Bitmap(Graphics.boxWidth, Graphics.boxHeight);
        this._backgroundSprite.bitmap.fillAll('white'); // 背景设为白色
        this.addChild(this._backgroundSprite);
    };

    Scene_PuzzleSwitch.prototype.onSelectOk = function() {
        var index = this._window.index();
        
        if (index < 4) {
            // 点击拼图块：切换索引并刷新
            currentIndices[index] = (currentIndices[index] + 1) % 4;
            SoundManager.playCursor();
            this._window.refresh();
            this._window.activate();
        } else if (index === 4) {
            // 点击确认按钮
            this.checkAnswer();
        } else if (index === 5) {
            // 点击退出按钮
            SoundManager.playCancel();
            this.popScene();
        }
    };

    Scene_PuzzleSwitch.prototype.checkAnswer = function() {
        var isCorrect = true;
        for (var i = 0; i < 4; i++) {
            if (currentIndices[i] !== targetAnswer[i]) isCorrect = false;
        }

        if (isCorrect) {
            this.executeWinLogic();
        } else {
            SoundManager.playBuzzer(); 
            $gameMessage.add("答案不正确，请重新检查。");
            this._window.activate();
        }
    };

    Scene_PuzzleSwitch.prototype.executeWinLogic = function() {
        SoundManager.playOk();
        $gameVariables.setValue(4, 2);
        if ($gameScreen.setZoom) $gameScreen.setZoom(2.0);
        if (rewardCommonEventId > 0) $gameTemp.reserveCommonEvent(rewardCommonEventId);
        this._window.deactivate();
        this.popScene();
    };

    // --- 窗口类定义 ---
    function Window_PuzzleControl() { this.initialize.apply(this, arguments); }
    Window_PuzzleControl.prototype = Object.create(Window_Selectable.prototype);
    Window_PuzzleControl.prototype.constructor = Window_PuzzleControl;

    Window_PuzzleControl.prototype.initialize = function() {
        var w = 840; // 稍微加宽以适应 6 列
        var h = 200;
        var x = (Graphics.boxWidth - w) / 2;
        var y = (Graphics.boxHeight - h) / 2;
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this.refresh();
        this.select(0);
        this.activate();
    };

    Window_PuzzleControl.prototype.maxItems = function() { return 6; }; // 4个拼图 + 确认 + 退出
    Window_PuzzleControl.prototype.maxCols = function() { return 6; };
    Window_PuzzleControl.prototype.itemHeight = function() { return 160; };

    Window_PuzzleControl.prototype.drawItem = function(index) {
        var rect = this.itemRect(index);
        this.contents.clearRect(rect.x, rect.y, rect.width, rect.height);

        if (index < 4) {
            // 绘制拼图图片
            var fileName = 'Puzzle_Item_' + currentIndices[index];
            var bitmap = ImageManager.loadPicture(fileName);
            var self = this;
            bitmap.addLoadListener(function() {
                var dx = rect.x + (rect.width - bitmap.width) / 2;
                var dy = rect.y + (rect.height - bitmap.height) / 2;
                self.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, dx, dy);
            });
        } else if (index === 4) {
            // 绘制“确认”
            this.changeTextColor(this.tpCostColor());
            var ty = rect.y + (rect.height - this.lineHeight()) / 2;
            this.drawText("确认", rect.x, ty, rect.width, 'center');
        } else if (index === 5) {
            // 绘制“退出”
            this.changeTextColor(this.hpGaugeColor1()); // 使用一个偏红/橙的颜色区分
            var ty = rect.y + (rect.height - this.lineHeight()) / 2;
            this.drawText("退出", rect.x, ty, rect.width, 'center');
        }
    };

    Window_PuzzleControl.prototype.refresh = function() {
        this.contents.clear();
        this.drawAllItems();
    };

})();