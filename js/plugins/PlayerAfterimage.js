/*:
 * @plugindesc 玩家残影/拖尾效果 v1.0
 * @author Claude
 *
 * @help
 * 玩家移动时（或奔跑时）在身后留下一串半透明残影，
 * 制造"冲刺 / 瞬移 / 速度感"的效果。
 *
 * @param Emit Interval
 * @text 生成间隔（帧）
 * @desc 每多少帧生成一个残影（越小越密，建议 2-5）
 * @type number
 * @default 3
 *
 * @param Ghost Life
 * @text 残影寿命（帧）
 * @desc 单个残影从出现到完全消失的帧数
 * @type number
 * @default 20
 *
 * @param Max Opacity
 * @text 最大透明度
 * @desc 残影出现瞬间的不透明度（0-255）
 * @type number
 * @min 0
 * @max 255
 * @default 130
 *
 * @param Tint Color
 * @text 色调 R,G,B,A
 * @desc 残影叠加的颜色和强度。A 越大染色越浓。空=不染色
 * @default 150,200,255,100
 *
 * @param Only When Dashing
 * @text 仅奔跑时
 * @desc 是否只在按 Shift 奔跑时才生成残影（true 推荐）
 * @type boolean
 * @default true
 */

(function() {
    var P = PluginManager.parameters('PlayerAfterimage');
    var INTERVAL = Number(P['Emit Interval'] || 3);
    var LIFE = Number(P['Ghost Life'] || 20);
    var MAX_ALPHA = Number(P['Max Opacity'] || 130);
    var ONLY_DASH = (P['Only When Dashing'] || 'true') === 'true';
    var TINT = null;
    if (P['Tint Color'] && P['Tint Color'].trim()) {
        var t = P['Tint Color'].split(',').map(function(s){ return Number(s.trim()); });
        if (t.length >= 3 && t.every(function(n){ return !isNaN(n); })) {
            TINT = [t[0], t[1], t[2], t[3] || 0];
        }
    }

    function findPlayerSprite(spriteset) {
        if (!spriteset || !spriteset._characterSprites) return null;
        for (var i = 0; i < spriteset._characterSprites.length; i++) {
            var s = spriteset._characterSprites[i];
            if (s._character === $gamePlayer) return s;
        }
        return null;
    }

    // ---- Spriteset 集成 ----
    var _cL = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _cL.call(this);
        this._ghostContainer = new Sprite();
        this._tilemap.addChild(this._ghostContainer);
        this._ghosts = [];
        this._ghostTimer = 0;
    };

    var _cC = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _cC.call(this);
        this._ghosts = [];
        this._ghostTimer = 0;
    };

    function spawnGhost(container, playerSprite) {
        var ghost = new Sprite();
        ghost.bitmap = playerSprite.bitmap;
        var f = playerSprite._frame;
        ghost.setFrame(f.x, f.y, f.width, f.height);
        ghost.anchor.x = playerSprite.anchor.x;
        ghost.anchor.y = playerSprite.anchor.y;
        ghost.x = playerSprite.x;
        ghost.y = playerSprite.y;
        ghost.z = playerSprite.z - 0.1; // 在玩家之后
        if (TINT) ghost.setBlendColor(TINT);
        ghost.opacity = MAX_ALPHA;
        container.addChild(ghost);
        return {
            sprite: ghost,
            life: 0,
            update: function() {
                this.life++;
                var t = this.life / LIFE;
                ghost.opacity = MAX_ALPHA * (1 - t);
                return this.life < LIFE;
            }
        };
    }

    var _up = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _up.call(this);
        if (!this._ghostContainer) return;

        var shouldEmit = $gamePlayer.isMoving();
        if (ONLY_DASH) shouldEmit = shouldEmit && $gamePlayer.isDashing();

        if (shouldEmit) {
            this._ghostTimer = (this._ghostTimer || 0) + 1;
            if (this._ghostTimer >= INTERVAL) {
                var ps = findPlayerSprite(this);
                if (ps && ps.bitmap && ps.bitmap.isReady()) {
                    this._ghosts.push(spawnGhost(this._ghostContainer, ps));
                }
                this._ghostTimer = 0;
            }
        } else {
            this._ghostTimer = 0;
        }

        for (var i = this._ghosts.length - 1; i >= 0; i--) {
            var g = this._ghosts[i];
            if (!g.update()) {
                this._ghostContainer.removeChild(g.sprite);
                this._ghosts.splice(i, 1);
            }
        }
    };
})();
