/*:
 * @plugindesc [v1.3] 能量收集 QTE 小游戏 (视觉优化版)
 * @author Gemini
 * @help 
 * 插件指令: 
 * StartPowerGame [难度] [目标次数]
 */

(function() {
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'StartPowerGame') {
            const speed = Number(args[0]) || 5;
            const target = Number(args[1]) || 3;
            SceneManager.push(Scene_PowerGame);
            SceneManager.prepareNextScene(speed, target);
        }
    };

    function Scene_PowerGame() { this.initialize.apply(this, arguments); }
    Scene_PowerGame.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_PowerGame.prototype.constructor = Scene_PowerGame;

    Scene_PowerGame.prototype.prepare = function(speed, target) {
        this._speed = speed;
        this._targetCount = target;
        this._currentSuccess = 0;
    };

    Scene_PowerGame.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createUI();
        this.createExitButton();
    };

    Scene_PowerGame.prototype.createUI = function() {
        const barW = 400;
        const barH = 40;
        const centerX = (Graphics.width - barW) / 2;
        const centerY = Graphics.height / 2;

        // 1. 进度条底色 - 已更换为图2的浅青色 (#E8F5F5)
        this._barBase = new Sprite(new Bitmap(barW, barH));
        this._barBase.x = centerX;
        this._barBase.y = centerY;
        // 使用图2提取的色值填充背景
        this._barBase.bitmap.fillRect(0, 0, barW, barH, '#E8F5F5'); 
        // 成功区域保持亮绿色
        this._barBase.bitmap.fillRect(160, 0, 80, barH, '#00FF00'); 
        this.addChild(this._barBase);

        // 2. 指针 - 为了在浅色背景下清晰，增加了深色描边逻辑
        this._cursor = new Sprite(new Bitmap(12, 54));
        this._cursor.bitmap.fillRect(0, 0, 12, 54, '#333333'); // 深色外框
        this._cursor.bitmap.fillRect(2, 2, 8, 50, '#FFFFFF'); // 白色中心
        this._cursor.anchor.x = 0.5;
        this._cursor.x = centerX;
        this._cursor.y = centerY - 7;
        this._cursor.direction = 1;
        this.addChild(this._cursor);

        // 3. 文字说明窗口
        this._helpWindow = new Window_Help(2);
        this.refreshHelpText();
        this.addWindow(this._helpWindow);
    };

    Scene_PowerGame.prototype.createExitButton = function() {
        this._exitSprite = new Sprite(new Bitmap(250, 40));
        this._exitSprite.x = Graphics.width - 260;
        this._exitSprite.y = Graphics.height - 50;
        this._exitSprite.bitmap.fontSize = 20;
        // 文字颜色设为深色以适配浅色调
        this._exitSprite.bitmap.textColor = '#FFFFFF'; 
        this._exitSprite.bitmap.outlineColor = 'rgba(0,0,0,0.5)';
        this._exitSprite.bitmap.drawText("按 ESC 放弃并退出", 0, 0, 250, 40, 'right');
        this.addChild(this._exitSprite);
    };

    Scene_PowerGame.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        
        // 指针移动
        this._cursor.x += this._speed * this._cursor.direction;
        const limitL = (Graphics.width - 400) / 2;
        const limitR = limitL + 400;
        
        if (this._cursor.x >= limitR || this._cursor.x <= limitL) {
            this._cursor.direction *= -1;
        }

        if (Input.isTriggered('ok')) {
            this.checkResult();
        } else if (Input.isTriggered('escape')) {
            SoundManager.playCancel();
            this.endGame(false);
        }
    };

    Scene_PowerGame.prototype.checkResult = function() {
        const barLeft = (Graphics.width - 400) / 2;
        const relativeX = this._cursor.x - barLeft;
        
        // 成功判定区 (160px 到 240px)
        if (relativeX >= 160 && relativeX <= 240) {
            SoundManager.playOk();
            this._currentSuccess++;
            this.refreshHelpText();
            if (this._currentSuccess >= this._targetCount) {
                this.endGame(true);
            }
        } else {
            SoundManager.playBuzzer();
            this.endGame(false);
        }
    };

    Scene_PowerGame.prototype.refreshHelpText = function() {
        const text = `玩法：指针进入【绿色区】时按下确定。\n目标：稳定能量核心 (${this._currentSuccess}/${this._targetCount})`;
        this._helpWindow.setText(text);
    };

    Scene_PowerGame.prototype.endGame = function(win) {
        $gameVariables.setValue(10, win ? 1 : 2);
        SceneManager.pop();
    };
})();