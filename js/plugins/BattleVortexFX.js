/*:
 * @plugindesc 战斗漩涡特效 v1.0（粒子螺旋 + 中心脉动 + 扩散波纹）
 * @author Claude
 *
 * @help
 * 在战斗场景（Scene_Battle）中，于指定屏幕位置叠加魔法漩涡特效。
 * 用于战斗背景正中央有漩涡/星池图案的地图（例如 PixelForestBG）。
 *
 * 默认只在 Map ID 列表里的地图触发，避免在所有战斗都显示。
 *
 * @param Enable
 * @text 启用
 * @type boolean
 * @default true
 *
 * @param Active Map IDs
 * @text 激活地图 ID
 * @desc 逗号分隔的 Map ID（仅在这些地图触发的战斗显示特效）。留空=所有战斗
 * @default 8
 *
 * @param Center X
 * @text 中心 X 坐标
 * @type number
 * @default 540
 *
 * @param Center Y
 * @text 中心 Y 坐标
 * @type number
 * @default 180
 *
 * @param Vortex Radius
 * @text 漩涡半径
 * @type number
 * @default 180
 *
 * @param Color
 * @text 主色 R,G,B
 * @default 180,150,255
 *
 * @param Particle Count
 * @text 同屏粒子数
 * @type number
 * @default 25
 *
 * @param Pulse Opacity
 * @text 中心脉动最大透明度
 * @type number
 * @min 0
 * @max 255
 * @default 100
 *
 * @param Ring Interval Min
 * @text 扩散波纹最小间隔（帧）
 * @type number
 * @default 120
 *
 * @param Ring Interval Max
 * @text 扩散波纹最大间隔（帧）
 * @type number
 * @default 240
 */

(function() {
    var P = PluginManager.parameters('BattleVortexFX');
    var ENABLE = (P['Enable'] || 'true') === 'true';
    var MAP_IDS = (P['Active Map IDs'] || '').split(',')
        .map(function(s){ return Number(s.trim()); }).filter(function(n){ return n > 0; });
    var CX = Number(P['Center X'] || 500);
    var CY = Number(P['Center Y'] || 220);
    var RADIUS = Number(P['Vortex Radius'] || 180);
    var COLOR = (P['Color'] || '180,150,255').split(',').map(function(s){ return Number(s.trim()); });
    var COUNT = Number(P['Particle Count'] || 25);
    var PULSE_ALPHA = Number(P['Pulse Opacity'] || 100);
    var RING_MIN = Number(P['Ring Interval Min'] || 120);
    var RING_MAX = Number(P['Ring Interval Max'] || 240);

    if (!ENABLE) return;

    var _bitmaps = {};
    function softCircle(r, g, b, radius) {
        var key = 'c,'+r+','+g+','+b+','+radius;
        if (_bitmaps[key]) return _bitmaps[key];
        var d = radius * 2;
        var bmp = new Bitmap(d, d);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0, 'rgba('+r+','+g+','+b+',1)');
        grad.addColorStop(0.5, 'rgba('+r+','+g+','+b+',0.4)');
        grad.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, d, d);
        if (bmp._setDirty) bmp._setDirty();
        _bitmaps[key] = bmp;
        return bmp;
    }

    function ringBitmap(r, g, b, radius, thickness) {
        var key = 'r,'+r+','+g+','+b+','+radius+','+thickness;
        if (_bitmaps[key]) return _bitmaps[key];
        var d = radius * 2 + 4;
        var bmp = new Bitmap(d, d);
        var ctx = bmp._context;
        ctx.strokeStyle = 'rgba('+r+','+g+','+b+',0.9)';
        ctx.lineWidth = thickness;
        ctx.shadowColor = 'rgba('+r+','+g+','+b+',1)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(d/2, d/2, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (bmp._setDirty) bmp._setDirty();
        _bitmaps[key] = bmp;
        return bmp;
    }

    function isActiveMap() {
        if (MAP_IDS.length === 0) return true; // 留空=全部
        var mapId = $gameMap ? $gameMap.mapId() : 0;
        return MAP_IDS.indexOf(mapId) >= 0;
    }

    // ---- Scene_Battle 集成 ----
    var _Scene_Battle_createSpriteset = Scene_Battle.prototype.createSpriteset;
    Scene_Battle.prototype.createSpriteset = function() {
        _Scene_Battle_createSpriteset.call(this);
        if (!isActiveMap()) return;
        this._vortexContainer = new Sprite();
        this.addChildAt(this._vortexContainer, this.getChildIndex(this._spriteset) + 1);
        this._vortexParticles = [];
        this._vortexRings = [];
        this._vortexPhase = 0;
        this._vortexRingTimer = RING_MIN + Math.floor(Math.random() * (RING_MAX - RING_MIN));

        // 中心脉动光点
        var pulseBmp = softCircle(COLOR[0], COLOR[1], COLOR[2], 60);
        this._vortexPulse = new Sprite(pulseBmp);
        this._vortexPulse.anchor.x = 0.5; this._vortexPulse.anchor.y = 0.5;
        this._vortexPulse.blendMode = PIXI.BLEND_MODES.ADD;
        this._vortexPulse.x = CX;
        this._vortexPulse.y = CY;
        this._vortexContainer.addChild(this._vortexPulse);
    };

    function spawnParticle(container) {
        var size = 2 + Math.floor(Math.random() * 3);
        var bmp = softCircle(COLOR[0], COLOR[1], COLOR[2], size * 2);
        var sprite = new Sprite(bmp);
        sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
        sprite.blendMode = PIXI.BLEND_MODES.ADD;
        container.addChild(sprite);

        var startAngle = Math.random() * Math.PI * 2;
        var startR = RADIUS * (0.7 + Math.random() * 0.3);
        var life = 0;
        var maxLife = 120 + Math.floor(Math.random() * 60);
        var speed = 0.02 + Math.random() * 0.02;
        var radiusDecay = startR / maxLife * 1.1;

        return {
            sprite: sprite,
            update: function() {
                life++;
                var t = life / maxLife;
                var currentR = Math.max(0, startR - radiusDecay * life);
                var angle = startAngle + life * speed;
                sprite.x = CX + Math.cos(angle) * currentR;
                sprite.y = CY + Math.sin(angle) * currentR * 0.6; // 椭圆压扁，像俯视漩涡
                sprite.opacity = 255 * Math.sin(t * Math.PI) * 0.9;
                var s = 0.5 + t * 0.5;
                sprite.scale.x = sprite.scale.y = s;
                return life < maxLife;
            }
        };
    }

    function spawnRing(container) {
        var sprite = new Sprite(ringBitmap(COLOR[0], COLOR[1], COLOR[2], 40, 2));
        sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
        sprite.blendMode = PIXI.BLEND_MODES.ADD;
        sprite.x = CX;
        sprite.y = CY;
        sprite.scale.x = 0.2;
        sprite.scale.y = 0.12; // 扁椭圆，贴着漩涡面
        container.addChild(sprite);

        var life = 0, maxLife = 80;
        return {
            sprite: sprite,
            update: function() {
                life++;
                var t = life / maxLife;
                var scale = 0.2 + t * (RADIUS / 40) * 0.9;
                sprite.scale.x = scale;
                sprite.scale.y = scale * 0.6;
                sprite.opacity = 255 * (1 - t) * 0.7;
                return life < maxLife;
            }
        };
    }

    var _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        if (!this._vortexContainer) return;

        this._vortexPhase += 0.04;

        // 中心脉动
        if (this._vortexPulse) {
            var pulse = (Math.sin(this._vortexPhase) + 1) * 0.5;
            this._vortexPulse.opacity = 30 + pulse * PULSE_ALPHA;
            var ps = 0.7 + pulse * 0.4;
            this._vortexPulse.scale.x = this._vortexPulse.scale.y = ps;
        }

        // 补充粒子到目标数量
        while (this._vortexParticles.length < COUNT) {
            this._vortexParticles.push(spawnParticle(this._vortexContainer));
        }
        for (var i = this._vortexParticles.length - 1; i >= 0; i--) {
            var p = this._vortexParticles[i];
            if (!p.update()) {
                this._vortexContainer.removeChild(p.sprite);
                this._vortexParticles.splice(i, 1);
            }
        }

        // 波纹
        this._vortexRingTimer--;
        if (this._vortexRingTimer <= 0) {
            this._vortexRings.push(spawnRing(this._vortexContainer));
            this._vortexRingTimer = RING_MIN + Math.floor(Math.random() * (RING_MAX - RING_MIN));
        }
        for (var j = this._vortexRings.length - 1; j >= 0; j--) {
            var r = this._vortexRings[j];
            if (!r.update()) {
                this._vortexContainer.removeChild(r.sprite);
                this._vortexRings.splice(j, 1);
            }
        }
    };
})();
