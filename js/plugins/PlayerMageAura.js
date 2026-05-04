/*:
 * @plugindesc 玩家魔法师光粒氛围 v1.0
 * @author Claude
 *
 * @help
 * 角色周身缓慢飘出柔光粒子，营造魔法师氛围。
 * 粒子从脚底附近随机位置升起，左右缓慢飘移，逐渐淡出。
 *
 * @param Active Mode
 * @text 何时激活
 * @desc 始终开启 / 仅移动时 / 仅静止时
 * @type select
 * @option 始终
 * @value always
 * @option 仅移动时
 * @value moving
 * @option 仅静止时
 * @value idle
 * @default always
 *
 * @param Emit Interval Min
 * @text 生成最小间隔（帧）
 * @desc 数值越小粒子越密
 * @type number
 * @default 14
 *
 * @param Emit Interval Max
 * @text 生成最大间隔（帧）
 * @type number
 * @default 26
 *
 * @param Particle Life
 * @text 单颗寿命（帧）
 * @type number
 * @default 50
 *
 * @param Max Opacity
 * @text 最大透明度
 * @type number
 * @min 0
 * @max 255
 * @default 170
 *
 * @param Colors
 * @text 颜色池
 * @desc 用分号分开多组 R,G,B，每次随机选一组
 * @default 180,160,255;150,200,255;220,190,255;200,220,255
 *
 * @param Particle Size
 * @text 粒子半径
 * @desc 建议 2-4
 * @type number
 * @default 3
 *
 * @param Rise Speed
 * @text 上升速度
 * @desc 每帧向上像素
 * @default 0.35
 *
 * @param Drift Amp
 * @text 横向飘动幅度
 * @type number
 * @default 8
 *
 * @param Spawn Radius X
 * @text 横向生成范围
 * @type number
 * @default 14
 *
 * @param Spawn Y Min
 * @text 起始 Y 最小（相对脚底）
 * @type number
 * @default -40
 *
 * @param Spawn Y Max
 * @text 起始 Y 最大（相对脚底）
 * @type number
 * @default -8
 */

(function() {
    var P = PluginManager.parameters('PlayerMageAura');
    var ACTIVE = P['Active Mode'] || 'always';
    var INT_MIN = Number(P['Emit Interval Min'] || 14);
    var INT_MAX = Number(P['Emit Interval Max'] || 26);
    var LIFE = Number(P['Particle Life'] || 50);
    var MAX_ALPHA = Number(P['Max Opacity'] || 170);
    var SIZE = Number(P['Particle Size'] || 3);
    var RISE = Number(P['Rise Speed'] || 0.35);
    var DRIFT_AMP = Number(P['Drift Amp'] || 8);
    var SX = Number(P['Spawn Radius X'] || 14);
    var SY_MIN = Number(P['Spawn Y Min'] || -40);
    var SY_MAX = Number(P['Spawn Y Max'] || -8);

    var COLORS = (P['Colors'] || '180,160,255').split(';').map(function(c){
        var rgb = c.split(',').map(function(s){ return Number(s.trim()); });
        return (rgb.length >= 3 && rgb.every(function(n){return !isNaN(n);})) ? rgb : [180,160,255];
    });

    var bitmapCache = {};
    function getParticleBitmap(r, g, b) {
        var key = r+','+g+','+b;
        if (bitmapCache[key]) return bitmapCache[key];
        var armLen = SIZE * 3;   // 星芒长度
        var pad = 2;
        var d = armLen * 2 + pad * 2;
        var bmp = new Bitmap(d, d);
        var ctx = bmp._context;
        var cx = d / 2, cy = d / 2;

        // 中心柔光（让星星有"晕开"感）
        var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, armLen * 0.7);
        glow.addColorStop(0, 'rgba('+r+','+g+','+b+',0.7)');
        glow.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, d, d);

        // 垂直光条（上下两芒）
        var gV = ctx.createLinearGradient(cx, cy - armLen, cx, cy + armLen);
        gV.addColorStop(0,   'rgba('+r+','+g+','+b+',0)');
        gV.addColorStop(0.5, 'rgba('+r+','+g+','+b+',0.85)');
        gV.addColorStop(1,   'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = gV;
        ctx.beginPath();
        ctx.moveTo(cx, cy - armLen);
        ctx.lineTo(cx + SIZE * 0.55, cy);
        ctx.lineTo(cx, cy + armLen);
        ctx.lineTo(cx - SIZE * 0.55, cy);
        ctx.closePath();
        ctx.fill();

        // 水平光条（左右两芒）
        var gH = ctx.createLinearGradient(cx - armLen, cy, cx + armLen, cy);
        gH.addColorStop(0,   'rgba('+r+','+g+','+b+',0)');
        gH.addColorStop(0.5, 'rgba('+r+','+g+','+b+',0.85)');
        gH.addColorStop(1,   'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = gH;
        ctx.beginPath();
        ctx.moveTo(cx - armLen, cy);
        ctx.lineTo(cx, cy - SIZE * 0.55);
        ctx.lineTo(cx + armLen, cy);
        ctx.lineTo(cx, cy + SIZE * 0.55);
        ctx.closePath();
        ctx.fill();

        if (bmp._setDirty) bmp._setDirty();
        bitmapCache[key] = bmp;
        return bmp;
    }

    // ---- Spriteset 集成 ----
    var _cL = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _cL.call(this);
        this._auraContainer = new Sprite();
        this._tilemap.addChild(this._auraContainer);
        this._auraParticles = [];
        this._auraTimer = 0;
        this._auraNext = INT_MIN + Math.floor(Math.random() * (INT_MAX - INT_MIN));
    };

    var _cC = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _cC.call(this);
        this._auraParticles = [];
        this._auraTimer = 0;
    };

    function spawnParticle(container) {
        var color = COLORS[Math.floor(Math.random() * COLORS.length)];
        var bmp = getParticleBitmap(color[0], color[1], color[2]);
        var sprite = new Sprite(bmp);
        sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
        sprite.blendMode = PIXI.BLEND_MODES.ADD;

        var xOffset = (Math.random() - 0.5) * 2 * SX;
        var yOffset = SY_MIN + Math.random() * (SY_MAX - SY_MIN);
        var phase = Math.random() * Math.PI * 2;
        var driftSpeed = 0.03 + Math.random() * 0.04;

        sprite.x = $gamePlayer.screenX() + xOffset;
        sprite.y = $gamePlayer.screenY() + yOffset;
        sprite.scale.x = sprite.scale.y = 0.3;
        sprite.rotation = Math.random() * Math.PI * 2;
        container.addChild(sprite);

        var initialY = sprite.y;
        var rotSpeed = (Math.random() - 0.5) * 0.04;
        return {
            sprite: sprite,
            life: 0,
            update: function() {
                this.life++;
                var t = this.life / LIFE;
                var followX = $gamePlayer.screenX() + xOffset;
                sprite.x = followX + Math.sin(phase + this.life * driftSpeed) * DRIFT_AMP;
                sprite.y = initialY - RISE * this.life;
                sprite.opacity = MAX_ALPHA * Math.sin(t * Math.PI);
                // 大小在出现时是小点，中段最大，结束又缩小（呼应 sin 透明度）
                var s = 0.3 + Math.sin(t * Math.PI) * 0.8;
                sprite.scale.x = sprite.scale.y = s;
                sprite.rotation += rotSpeed;
                return this.life < LIFE;
            }
        };
    }

    function shouldEmit() {
        if (ACTIVE === 'always') return true;
        if (ACTIVE === 'moving') return $gamePlayer.isMoving();
        if (ACTIVE === 'idle') return !$gamePlayer.isMoving() && $gamePlayer._stopCount > 3;
        return true;
    }

    var _up = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _up.call(this);
        if (!this._auraContainer) return;

        if (shouldEmit()) {
            this._auraTimer++;
            if (this._auraTimer >= this._auraNext) {
                this._auraParticles.push(spawnParticle(this._auraContainer));
                this._auraTimer = 0;
                this._auraNext = INT_MIN + Math.floor(Math.random() * (INT_MAX - INT_MIN));
            }
        }

        for (var i = this._auraParticles.length - 1; i >= 0; i--) {
            var p = this._auraParticles[i];
            if (!p.update()) {
                this._auraContainer.removeChild(p.sprite);
                this._auraParticles.splice(i, 1);
            }
        }
    };
})();
