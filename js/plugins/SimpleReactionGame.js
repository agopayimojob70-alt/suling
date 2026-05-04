/*:
 * @plugindesc 极简点击反应小游戏 - 适用于2D像素风格项目
 * @author Gemini_AI
 * * @help
 * 插件指令: 
 * StartMinigame 3 1000   // 参数1: 需点击次数, 参数2: 消失时间(毫秒)
 * * 游戏结果会存入 变量[10]：1为成功，2为失败。
 */

(function() {
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'StartMinigame') {
            const count = Number(args[0]) || 3;
            const duration = Number(args[500]) || 1000;
            SceneManager.push(Scene_ReactionGame);
            SceneManager.prepareNextScene(count, duration);
        }
    };

    function Scene_ReactionGame() { this.initialize.apply(this, arguments); }
    Scene_ReactionGame.prototype = Object.create(Scene_Base.prototype);
    Scene_ReactionGame.prototype.constructor = Scene_ReactionGame;

    Scene_ReactionGame.prototype.prepare = function(count, duration) {
        this._maxHits = count;
        this._duration = duration;
        this._hits = 0;
        this._timer = 0;
    };

    Scene_ReactionGame.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createTarget();
        this.createStatusText();
    };

    Scene_ReactionGame.prototype.createBackground = function() {
        this._background = new Sprite(SceneManager.backgroundBitmap());
        this.addChild(this._background);
    };

    Scene_ReactionGame.prototype.createTarget = function() {
        this._target = new Sprite(new Bitmap(80, 80));
        // 画一个亮色的像素风圆圈（类似灵力球）
        this._target.bitmap.drawCircle(40, 40, 35, '#55ffff');
        this._target.anchor.x = 0.5;
        this._target.anchor.y = 0.5;
        this._target.visible = false;
        this.addChild(this._target);
        this.resetTarget();
    };

    Scene_ReactionGame.prototype.createStatusText = function() {
        this._text = new Window_Help(1);
        this._text.setText("快速点击出现的灵力球！");
        this.addChild(this._text);
    };

    Scene_ReactionGame.prototype.resetTarget = function() {
        this._target.x = 100 + Math.random() * (Graphics.width - 200);
        this._target.y = 100 + Math.random() * (Graphics.height - 200);
        this._target.visible = true;
        this._timer = this._duration;
    };

    Scene_ReactionGame.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        this._timer -= (1000 / 60);
        
        if (TouchInput.isTriggered() && this._target.visible) {
            const dx = TouchInput.x - this._target.x;
            const dy = TouchInput.y - this._target.y;
            if (Math.sqrt(dx*dx + dy*dy) < 40) {
                this.onHit();
            }
        }

        if (this._timer <= 0) { this.onFail(); }
    };

    Scene_ReactionGame.prototype.onHit = function() {
        SoundManager.playOk();
        this._hits++;
        if (this._hits >= this._maxHits) {
            $gameVariables.setValue(10, 1); // 成功
            SceneManager.pop();
        } else {
            this.resetTarget();
        }
    };

    Scene_ReactionGame.prototype.onFail = function() {
        SoundManager.playBuzzer();
        $gameVariables.setValue(10, 2); // 失败
        SceneManager.pop();
    };
})();