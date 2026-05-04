/*:
 * @plugindesc 脚步尘土效果 v1.0
 * @author Claude
 *
 * @help
 * 玩家行走时在脚下生成淡淡的尘土粒子，增加脚步实感。
 *
 * @param Emit Interval
 * @text 生成间隔（帧）
 * @desc 玩家移动中每多少帧生成一次尘土（60=1秒）
 * @type number
 * @default 14
 *
 * @param Dust Color
 * @text 尘土颜色 R,G,B
 * @desc 默认土灰色
 * @default 200,185,160
 *
 * @param Dust Life
 * @text 尘土寿命（帧）
 * @desc 单颗尘土从出现到消失的帧数
 * @type number
 * @default 28
 *
 * @param Max Opacity
 * @text 最大透明度
 * @desc 0-255
 * @type number
 * @min 0
 * @max 255
 * @default 140
 *
 * @param Rise Pixels
 * @text 上升像素
 * @desc 尘土在寿命内向上飘多少像素
 * @type number
 * @default 4
 *
 * @param Y Offset
 * @text Y 偏移
 * @desc 尘土相对脚底位置的 Y 偏移（负数上移）
 * @type number
 * @default -2
 *
 * @param Affect Followers
 * @text 跟随者也有
 * @desc 跟随者走路也生成尘土
 * @type boolean
 * @default false
 */

(function() {
    var P = PluginManager.parameters('FootstepDust');
    var INTERVAL = Number(P['Emit Interval'] || 14);
    var COLOR = (P['Dust Color'] || '200,185,160').split(',').map(function(s){ return Number(s.trim()); });
    var LIFE = Number(P['Dust Life'] || 28);
    var MAX_ALPHA = Number(P['Max Opacity'] || 140);
    var RISE = Number(P['Rise Pixels'] || 4);
    var Y_OFFSET = Number(P['Y Offset'] || -2);
    var AFFECT_FOLLOWERS = (P['Affect Followers'] || 'false') === 'true';

    var dustBitmap = null;
    function getDustBitmap() {
        if (dustBitmap) return dustBitmap;
        var size = 14;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grad.addColorStop(0, 'rgba('+COLOR[0]+','+COLOR[1]+','+COLOR[2]+',0.9)');
        grad.addColorStop(0.5, 'rgba('+COLOR[0]+','+COLOR[1]+','+COLOR[2]+',0.4)');
        grad.addColorStop(1, 'rgba('+COLOR[0]+','+COLOR[1]+','+COLOR[2]+',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        if (bmp._setDirty) bmp._setDirty();
        dustBitmap = bmp;
        return bmp;
    }

    // ---- Spriteset 集成 ----
    var _cL = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _cL.call(this);
        this._dustContainer = new Sprite();
        this._tilemap.addChild(this._dustContainer);
        this._dustParticles = [];
        this._dustTimers = {};  // key 为 character 唯一标识
    };

    var _cC = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _cC.call(this);
        this._dustParticles = [];
        this._dustTimers = {};
    };

    function characterKey(ch) {
        if (ch === $gamePlayer) return 'player';
        if (ch instanceof Game_Follower) return 'follower_' + ch._memberIndex;
        return null;
    }

    function spawnDust(container, ch, side) {
        var sprite = new Sprite(getDustBitmap());
        sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
        var startX = ch.screenX() + (side || 0) + (Math.random() - 0.5) * 3;
        var startY = ch.screenY() + Y_OFFSET;
        sprite.x = startX;
        sprite.y = startY;
        sprite.scale.x = sprite.scale.y = 0.6;
        container.addChild(sprite);
        return {
            sprite: sprite,
            life: 0,
            update: function() {
                this.life++;
                var t = this.life / LIFE;
                sprite.y = startY - RISE * t;
                sprite.scale.x = sprite.scale.y = 0.6 + t * 0.8;
                sprite.opacity = MAX_ALPHA * (1 - t);
                return this.life < LIFE;
            }
        };
    }

    var _up = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _up.call(this);
        if (!this._dustContainer) return;

        var targets = [$gamePlayer];
        if (AFFECT_FOLLOWERS && $gamePlayer.followers) {
            $gamePlayer.followers().visibleFollowers().forEach(function(f){ targets.push(f); });
        }

        var self = this;
        targets.forEach(function(ch){
            var key = characterKey(ch);
            if (!key) return;
            if (ch.isMoving()) {
                self._dustTimers[key] = (self._dustTimers[key] || 0) + 1;
                if (self._dustTimers[key] >= INTERVAL) {
                    // 交替左右脚位置
                    ch._dustSide = ch._dustSide === 1 ? -1 : 1;
                    var sideOffset = ch._dustSide * 3;
                    self._dustParticles.push(spawnDust(self._dustContainer, ch, sideOffset));
                    self._dustTimers[key] = 0;
                }
            } else {
                self._dustTimers[key] = 0;
            }
        });

        // 更新粒子
        for (var i = this._dustParticles.length - 1; i >= 0; i--) {
            var p = this._dustParticles[i];
            if (!p.update()) {
                this._dustContainer.removeChild(p.sprite);
                this._dustParticles.splice(i, 1);
            }
        }
    };
})();
