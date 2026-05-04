/*:
 * @plugindesc 自定义图片气泡提醒 v1.0 (读取 img/system/)
 * @author Gemini
 *
 * @help
 * 使用方法：
 * 1. 把你的气泡图片（例如：Exclamation.png）放入项目的 img/system/ 目录。
 * 2. 在事件的【备注】(Note) 栏输入：<bubble:图片名>
 * 注意：不需要输入后缀名。例如：<bubble:Exclamation>
 *
 * 插件特点：
 * - 自动在玩家和事件头上生成图片。
 * - 带有呼吸灯浮动效果。
 * - 只有靠近时才会显示。
 */

(function() {
    var TRIGGER_DISTANCE = 2; // 触发距离（格）

    // --- 核心逻辑：在精灵层添加气泡 ---

    var _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        this.updatePictureBubble();
    };

    Sprite_Character.prototype.updatePictureBubble = function() {
        var char = this._character;
        if (!char) return;

        // 获取图片名判定
        var bubbleName = "";
        if (char instanceof Game_Event) {
            if (char._erased || !char.event()) return;
            bubbleName = char.event().meta.bubble;
        } else if (char instanceof Game_Player) {
            // 玩家动态寻找附近有备注的事件
            bubbleName = this.findNearbyEventBubble();
        }

        if (bubbleName) {
            this.createBubbleSprite(bubbleName);
        } else {
            this.removeBubbleSprite();
        }
    };

    // 寻找附近事件的备注
    Sprite_Character.prototype.findNearbyEventBubble = function() {
        var events = $gameMap.events();
        for (var i = 0; i < events.length; i++) {
            var e = events[i];
            if (e.event().meta.bubble && !e._erased) {
                var dx = Math.abs(e.deltaXFrom($gamePlayer.x));
                var dy = Math.abs(e.deltaYFrom($gamePlayer.y));
                if (dx + dy <= TRIGGER_DISTANCE) return e.event().meta.bubble;
            }
        }
        return "";
    };

    // 创建气泡精灵
    Sprite_Character.prototype.createBubbleSprite = function(name) {
        if (this._bubbleSprite && this._bubbleName === name) {
            this._bubbleSprite.visible = true;
            // 简单的浮动动画
            this._bubbleSprite.y = -this.patternHeight() - 20 + Math.sin(Date.now() / 200) * 5;
            return;
        }
        
        if (this._bubbleSprite) this.removeBubbleSprite();

        this._bubbleSprite = new Sprite();
        this._bubbleSprite.bitmap = ImageManager.loadSystem(name);
        this._bubbleSprite.anchor.x = 0.5;
        this._bubbleSprite.anchor.y = 1;
        this._bubbleName = name;
        this.addChild(this._bubbleSprite);
    };

    Sprite_Character.prototype.removeBubbleSprite = function() {
        if (this._bubbleSprite) {
            this.removeChild(this._bubbleSprite);
            this._bubbleSprite = null;
            this._bubbleName = "";
        }
    };

})();