/*:
 * @plugindesc 场景氛围动画插件 v2.0（冒泡/蒸汽/闪光/光晕/符文/烛光/尘埃）
 * @author Claude
 *
 * @help
 * 在事件的【备注】栏添加以下任一标签：
 *
 *   <fxBubble>           默认色冒泡
 *   <fxBubble:r,g,b>     指定颜色冒泡
 *   <fxSteam>            蒸汽
 *   <fxSparkle>          偶发闪光
 *   <fxGlow>             柔和呼吸光晕
 *   <fxRunes>            旋转符文圈（适合魔法阵、召唤圈）
 *   <fxRunes:r,g,b>      指定颜色
 *   <fxCandle>           烛光（橙黄暖光 + 随机抖动）
 *   <fxCandle:r,g,b>     指定颜色
 *
 * 位置偏移：
 *   <fxX:-8> <fxY:-16>       所有效果通用
 *   <fxRunesY:-24>           针对 runes 单独 Y 偏移（其他类型类推）
 *
 * 额外参数：
 *   <fxRunesSize:48>         符文圈半径
 *
 * 全图尘埃：
 *   在"Ambient Dust Map IDs"里填地图ID（逗号分隔），该地图会持续飘尘。
 *
 * @param Default Color
 * @desc 未指定颜色时的默认 RGB
 * @default 220,220,255
 *
 * @param Debug Markers
 * @text 调试标记
 * @desc 是否显示发射器位置的红点（用于调校位置）。true / false
 * @type boolean
 * @default false
 *
 * @param Ambient Dust Map IDs
 * @text 尘埃地图 ID
 * @desc 需要飘尘的地图 ID，逗号分隔（例：5,6,7）。空=都不开
 * @default
 *
 * @param Ambient Dust Rate
 * @text 尘埃生成速率
 * @desc 每多少帧生成一颗尘埃（越小越多，建议 20-60）
 * @type number
 * @default 35
 *
 * @param Ambient Dust Color
 * @text 尘埃颜色
 * @desc 飘尘的 RGB
 * @default 220,210,180
 *
 * @param Ambient Dust Opacity
 * @text 尘埃最大透明度
 * @type number
 * @min 0
 * @max 255
 * @default 70
 */

(function() {
    var params = PluginManager.parameters('AmbientFX');
    var DEFAULT_COLOR = (params['Default Color'] || '220,220,255')
        .split(',').map(function(s){ return Number(s.trim()); });
    var DEBUG_MARKERS = (params['Debug Markers'] || 'false') === 'true';
    var DUST_MAP_IDS = (params['Ambient Dust Map IDs'] || '').split(',')
        .map(function(s){ return Number(s.trim()); }).filter(function(n){ return n > 0; });
    var DUST_RATE = Number(params['Ambient Dust Rate'] || 35);
    var DUST_COLOR = (params['Ambient Dust Color'] || '220,210,180')
        .split(',').map(function(s){ return Number(s.trim()); });
    var DUST_ALPHA = Number(params['Ambient Dust Opacity'] || 70);

    // ---- 位图缓存 ----
    var circleCache = {};

    // 空心泡泡：细亮边 + 一个高光点
    function getBubbleRing(r, g, b, radius) {
        var key = 'ring,'+r+','+g+','+b+','+radius;
        if (circleCache[key]) return circleCache[key];
        var pad = 2;
        var size = radius * 2 + pad * 2;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var cx = size / 2, cy = size / 2;
        // 外层柔光（给泡泡一点氛围）
        var grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius + 1);
        grad.addColorStop(0, 'rgba('+r+','+g+','+b+',0)');
        grad.addColorStop(0.7, 'rgba('+r+','+g+','+b+',0.25)');
        grad.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        // 亮边
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0.5, radius - 0.5), 0, Math.PI * 2);
        ctx.stroke();
        // 左上高光小点
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(cx - radius * 0.35, cy - radius * 0.35, Math.max(0.4, radius * 0.25), 0, Math.PI * 2);
        ctx.fill();
        if (bmp._setDirty) bmp._setDirty();
        circleCache[key] = bmp;
        return bmp;
    }

    function getSoftCircle(r, g, b, radius) {
        var key = r+','+g+','+b+','+radius;
        if (circleCache[key]) return circleCache[key];
        var size = radius * 2;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0,   'rgba('+r+','+g+','+b+',1)');
        grad.addColorStop(0.5, 'rgba('+r+','+g+','+b+',0.5)');
        grad.addColorStop(1,   'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        if (bmp._setDirty) bmp._setDirty();
        circleCache[key] = bmp;
        return bmp;
    }
    function getSparkle(r, g, b, size) {
        var key = 'sp,'+r+','+g+','+b+','+size;
        if (circleCache[key]) return circleCache[key];
        var s = size;
        var bmp = new Bitmap(s * 2, s * 2);
        var ctx = bmp._context;
        ctx.translate(s, s);
        var grad = ctx.createLinearGradient(0, -s, 0, s);
        grad.addColorStop(0, 'rgba('+r+','+g+','+b+',0)');
        grad.addColorStop(0.5, 'rgba('+r+','+g+','+b+',1)');
        grad.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        // 绘制四芒星
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s*0.2, 0); ctx.lineTo(0, s); ctx.lineTo(-s*0.2, 0);
        ctx.closePath(); ctx.fill();
        var grad2 = ctx.createLinearGradient(-s, 0, s, 0);
        grad2.addColorStop(0, 'rgba('+r+','+g+','+b+',0)');
        grad2.addColorStop(0.5, 'rgba('+r+','+g+','+b+',1)');
        grad2.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.moveTo(-s, 0); ctx.lineTo(0, s*0.2); ctx.lineTo(s, 0); ctx.lineTo(0, -s*0.2);
        ctx.closePath(); ctx.fill();
        if (bmp._setDirty) bmp._setDirty();
        circleCache[key] = bmp;
        return bmp;
    }

    // 光柱：竖直长方形，底部最亮，向上和两侧淡出
    function getBeamBitmap(r, g, b, w, h) {
        var key = 'beam,'+r+','+g+','+b+','+w+','+h;
        if (circleCache[key]) return circleCache[key];
        var bmp = new Bitmap(w, h);
        var ctx = bmp._context;
        var gV = ctx.createLinearGradient(0, h, 0, 0);
        gV.addColorStop(0, 'rgba('+r+','+g+','+b+',0.9)');
        gV.addColorStop(1, 'rgba('+r+','+g+','+b+',0)');
        ctx.fillStyle = gV;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-in';
        var gH = ctx.createLinearGradient(0, 0, w, 0);
        gH.addColorStop(0, 'rgba(0,0,0,0)');
        gH.addColorStop(0.5, 'rgba(0,0,0,1)');
        gH.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gH;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        if (bmp._setDirty) bmp._setDirty();
        circleCache[key] = bmp;
        return bmp;
    }

    // 符文圈：外圈 + 内圈 + 8 个菱形符文
    function getRuneRingBitmap(r, g, b, radius) {
        var key = 'rune,'+r+','+g+','+b+','+radius;
        if (circleCache[key]) return circleCache[key];
        var pad = 8;
        var size = radius * 2 + pad * 2;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var cx = size / 2;
        // 外发光圈
        ctx.shadowColor = 'rgba('+r+','+g+','+b+',1)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba('+r+','+g+','+b+',0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cx, radius - 2, 0, Math.PI * 2);
        ctx.stroke();
        // 内圈细线
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba('+r+','+g+','+b+',0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cx, radius - 8, 0, Math.PI * 2);
        ctx.stroke();
        // 8 个菱形符文
        var runeCount = 8;
        var rR = radius - 5;
        ctx.fillStyle = 'rgba('+r+','+g+','+b+',1)';
        for (var i = 0; i < runeCount; i++) {
            var ang = (i / runeCount) * Math.PI * 2;
            var rx = cx + Math.cos(ang) * rR;
            var ry = cx + Math.sin(ang) * rR;
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(ang);
            ctx.beginPath();
            ctx.moveTo(0, -2.5);
            ctx.lineTo(1.5, 0);
            ctx.lineTo(0, 2.5);
            ctx.lineTo(-1.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        if (bmp._setDirty) bmp._setDirty();
        circleCache[key] = bmp;
        return bmp;
    }

    function parseColor(raw) {
        if (typeof raw === 'string' && raw.indexOf(',') >= 0) {
            var a = raw.split(',').map(function(s){return Number(s.trim());});
            if (a.length >= 3 && a.every(function(n){return !isNaN(n);})) return a;
        }
        return DEFAULT_COLOR;
    }

    // ---- 效果配置工厂 ----
    function buildSpec(meta) {
        var specs = [];
        var defaultOx = meta.fxX !== undefined ? Number(meta.fxX) : 0;
        var defaultOy = meta.fxY !== undefined ? Number(meta.fxY) : 0;
        ['bubble','steam','sparkle','glow','runes','candle','beam'].forEach(function(type){
            var cap = type.charAt(0).toUpperCase() + type.slice(1);
            var key = 'fx' + cap;
            if (meta[key] !== undefined) {
                var ox = (meta['fx' + cap + 'X'] !== undefined) ? Number(meta['fx' + cap + 'X']) : defaultOx;
                var oy = (meta['fx' + cap + 'Y'] !== undefined) ? Number(meta['fx' + cap + 'Y']) : defaultOy;
                var spec = { type: type, color: parseColor(meta[key]), ox: ox, oy: oy };
                if (type === 'runes') {
                    if (meta['fxRunesSize'] !== undefined) spec.radius = Number(meta['fxRunesSize']);
                    if (meta['fxRunesDir'] !== undefined) spec.dir = Number(meta['fxRunesDir']);
                }
                if (type === 'beam') {
                    if (meta['fxBeamW'] !== undefined) spec.w = Number(meta['fxBeamW']);
                    if (meta['fxBeamH'] !== undefined) spec.h = Number(meta['fxBeamH']);
                }
                specs.push(spec);
            }
        });
        return specs;
    }

    // ---- 粒子对象 ----
    function Particle(sprite, update) {
        this.sprite = sprite;
        this.update = update; // 返回 true 表示继续存在，false 表示销毁
    }

    // ---- 发射器 ----
    function Emitter(spec) {
        this.spec = spec;
        this.cooldown = 0;
        this.particles = [];
        this.phase = Math.random() * Math.PI * 2;
    }
    Emitter.prototype.spawn = function(x, y, container) {
        var spec = this.spec;
        var c = spec.color;
        var p;
        if (spec.type === 'bubble') {
            // 随机大小：多数小 (1.5-2.5)，偶尔稍大 (3)
            var radius = Math.random() < 0.75 ? (1.5 + Math.random()) : (2.5 + Math.random());
            var bmp = getBubbleRing(c[0], c[1], c[2], Math.max(2, Math.round(radius)));
            var sprite = new Sprite(bmp);
            sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
            // 不用 ADD，保持正常空心泡泡看起来更像气泡
            sprite.x = x + (Math.random() - 0.5) * 3;
            sprite.y = y;
            container.addChild(sprite);
            var life = 0, maxLife = 40 + Math.random() * 20;
            var riseY = 14 + Math.random() * 8;
            var startX = sprite.x;
            var wobbleAmp = 0.8 + Math.random() * 1.0;
            p = new Particle(sprite, function(){
                life++;
                var t = life / maxLife;
                sprite.y = y - riseY * t;
                sprite.x = startX + Math.sin(t * Math.PI * 3) * wobbleAmp;
                // 末尾渐大一点点（像泡泡要破了）
                var s = 1 + t * 0.2;
                sprite.scale.x = sprite.scale.y = s;
                sprite.opacity = 255 * Math.min(1, (1 - t) * 1.5) * 0.95;
                return life < maxLife;
            });
        } else if (spec.type === 'steam') {
            var r = 6 + Math.random() * 3;
            var bmp = getSoftCircle(c[0], c[1], c[2], Math.round(r * 2.5));
            var sprite = new Sprite(bmp);
            sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
            sprite.blendMode = PIXI.BLEND_MODES.ADD;
            sprite.x = x + (Math.random() - 0.5) * 6;
            sprite.y = y;
            sprite.scale.x = sprite.scale.y = 0.6;
            container.addChild(sprite);
            var life = 0, maxLife = 80 + Math.random() * 30;
            var riseY = 32 + Math.random() * 16;
            var driftX = (Math.random() - 0.5) * 10;
            p = new Particle(sprite, function(){
                life++;
                var t = life / maxLife;
                sprite.y = y - riseY * t;
                sprite.x = x + driftX * t;
                sprite.opacity = 255 * Math.sin(t * Math.PI) * 0.2;
                var s = 0.5 + t * 1.0;
                sprite.scale.x = sprite.scale.y = s;
                return life < maxLife;
            });
        } else if (spec.type === 'sparkle') {
            var s = 8 + Math.floor(Math.random() * 4);
            var bmp = getSparkle(c[0], c[1], c[2], s);
            var sprite = new Sprite(bmp);
            sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
            sprite.blendMode = PIXI.BLEND_MODES.ADD;
            sprite.x = x + (Math.random() - 0.5) * 24;
            sprite.y = y + (Math.random() - 0.5) * 16;
            sprite.scale.x = sprite.scale.y = 0.2;
            container.addChild(sprite);
            var life = 0, maxLife = 30;
            p = new Particle(sprite, function(){
                life++;
                var t = life / maxLife;
                var scale = Math.sin(t * Math.PI);
                sprite.scale.x = sprite.scale.y = 0.3 + scale * 1.0;
                sprite.opacity = 255 * scale;
                sprite.rotation += 0.05;
                return life < maxLife;
            });
        }
        if (p) this.particles.push(p);
    };
    Emitter.prototype.update = function(x, y, container) {
        this.phase += 0.05;

        // glow 是常驻 sprite，不走粒子
        if (this.spec.type === 'glow') {
            if (!this._glowSprite) {
                var c = this.spec.color;
                this._glowSprite = new Sprite(getSoftCircle(c[0], c[1], c[2], 32));
                this._glowSprite.anchor.x = 0.5; this._glowSprite.anchor.y = 0.5;
                this._glowSprite.blendMode = PIXI.BLEND_MODES.ADD;
                container.addChild(this._glowSprite);
            }
            this._glowSprite.x = x;
            this._glowSprite.y = y;
            var t = (Math.sin(this.phase) + 1) * 0.5;
            this._glowSprite.opacity = 40 + t * 50;
            return;
        }

        // runes 常驻旋转环
        if (this.spec.type === 'runes') {
            if (!this._runeSprite) {
                var c = this.spec.color;
                var radius = this.spec.radius || 36;
                this._runeSprite = new Sprite(getRuneRingBitmap(c[0], c[1], c[2], radius));
                this._runeSprite.anchor.x = 0.5; this._runeSprite.anchor.y = 0.5;
                this._runeSprite.blendMode = PIXI.BLEND_MODES.ADD;
                container.addChild(this._runeSprite);
            }
            this._runeSprite.x = x;
            this._runeSprite.y = y;
            var dir = (this.spec.dir !== undefined) ? this.spec.dir : -1;
            this._runeSprite.rotation += 0.004 * dir;
            var tt = (Math.sin(this.phase * 0.4) + 1) * 0.5;
            this._runeSprite.opacity = 50 + tt * 60;
            return;
        }

        // beam 光柱
        if (this.spec.type === 'beam') {
            if (!this._beamSprite) {
                var c = this.spec.color;
                var bw = this.spec.w || 32;
                var bh = this.spec.h || 100;
                this._beamSprite = new Sprite(getBeamBitmap(c[0], c[1], c[2], bw, bh));
                this._beamSprite.anchor.x = 0.5; this._beamSprite.anchor.y = 1; // 底部锚点
                this._beamSprite.blendMode = PIXI.BLEND_MODES.ADD;
                container.addChild(this._beamSprite);
            }
            this._beamSprite.x = x;
            this._beamSprite.y = y;
            var bt = (Math.sin(this.phase * 0.5) + 1) * 0.5;
            this._beamSprite.opacity = 40 + bt * 55;
            return;
        }

        // candle 常驻烛光（带随机抖动）
        if (this.spec.type === 'candle') {
            if (!this._candleSprite) {
                var c = this.spec.color;
                this._candleSprite = new Sprite(getSoftCircle(c[0], c[1], c[2], 28));
                this._candleSprite.anchor.x = 0.5; this._candleSprite.anchor.y = 0.5;
                this._candleSprite.blendMode = PIXI.BLEND_MODES.ADD;
                container.addChild(this._candleSprite);
            }
            this._candleSprite.x = x;
            this._candleSprite.y = y;
            var base = (Math.sin(this.phase * 1.2) + 1) * 0.5 * 0.4 + 0.5;
            var flicker = (Math.random() - 0.5) * 0.2;
            var intensity = Math.max(0.25, Math.min(1, base + flicker));
            this._candleSprite.opacity = 180 * intensity;
            this._candleSprite.scale.x = this._candleSprite.scale.y = 0.85 + intensity * 0.3;
            return;
        }

        // 冒泡/蒸汽/闪光：按间隔生成粒子
        this.cooldown--;
        if (this.cooldown <= 0) {
            this.spawn(x, y, container);
            if (this.spec.type === 'bubble')   this.cooldown = 30 + Math.floor(Math.random() * 30);
            if (this.spec.type === 'steam')    this.cooldown = 30 + Math.floor(Math.random() * 20);
            if (this.spec.type === 'sparkle')  this.cooldown = 80 + Math.floor(Math.random() * 80);
        }
        // 更新粒子
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            var alive = p.update();
            if (!alive) {
                container.removeChild(p.sprite);
                this.particles.splice(i, 1);
            }
        }
    };
    Emitter.prototype.dispose = function(container) {
        this.particles.forEach(function(p){ container.removeChild(p.sprite); });
        this.particles = [];
        if (this._glowSprite) { container.removeChild(this._glowSprite); this._glowSprite = null; }
        if (this._runeSprite) { container.removeChild(this._runeSprite); this._runeSprite = null; }
        if (this._candleSprite) { container.removeChild(this._candleSprite); this._candleSprite = null; }
        if (this._beamSprite) { container.removeChild(this._beamSprite); this._beamSprite = null; }
    };

    // ---- Spriteset 集成 ----
    var _cL = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _cL.call(this);
        this._fxEmitters = {};
        this._fxContainer = new Sprite();
        this._tilemap.addChild(this._fxContainer);
        this._dustParticles = [];
        this._dustTimer = 0;
        this._dustContainer = new Sprite();
        this._tilemap.addChild(this._dustContainer);
    };

    var _cC = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _cC.call(this);
        this._fxEmitters = {};
        this._dustParticles = [];
    };

    var _up = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _up.call(this);
        this.updateAmbientFX();
        this.updateAmbientDust();
    };

    // ---- Map-wide 飘尘 ----
    Spriteset_Map.prototype.updateAmbientDust = function() {
        if (!this._dustContainer) return;
        if (DUST_MAP_IDS.indexOf($gameMap.mapId()) < 0) return;

        this._dustTimer++;
        if (this._dustTimer >= DUST_RATE) {
            this._dustTimer = 0;
            var sprite = new Sprite(getSoftCircle(DUST_COLOR[0], DUST_COLOR[1], DUST_COLOR[2], 4));
            sprite.anchor.x = 0.5; sprite.anchor.y = 0.5;
            sprite.blendMode = PIXI.BLEND_MODES.ADD;
            var sx = Math.random() * Graphics.width;
            var sy = Math.random() * Graphics.height;
            sprite.x = sx;
            sprite.y = sy;
            sprite.scale.x = sprite.scale.y = 0.4 + Math.random() * 0.4;
            this._dustContainer.addChild(sprite);
            var phase = Math.random() * Math.PI * 2;
            var life = 0, maxLife = 360 + Math.floor(Math.random() * 360); // 6-12 秒
            var driftX = (Math.random() - 0.5) * 0.3;
            var riseY = -0.15 - Math.random() * 0.15;
            this._dustParticles.push({
                sprite: sprite,
                update: function() {
                    life++;
                    sprite.x += driftX + Math.sin(phase + life * 0.02) * 0.15;
                    sprite.y += riseY;
                    var t = life / maxLife;
                    sprite.opacity = DUST_ALPHA * Math.sin(t * Math.PI);
                    return life < maxLife;
                }
            });
        }
        for (var i = this._dustParticles.length - 1; i >= 0; i--) {
            var p = this._dustParticles[i];
            if (!p.update()) {
                this._dustContainer.removeChild(p.sprite);
                this._dustParticles.splice(i, 1);
            }
        }
    };

    Spriteset_Map.prototype.updateAmbientFX = function() {
        if (!this._fxContainer) return;
        var liveIds = {};
        var events = $gameMap.events();
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            if (!ev.event || ev._erased || !ev.event()) continue;
            var meta = ev.event().meta;
            var specs = buildSpec(meta);
            if (specs.length === 0) continue;

            var id = ev.eventId();
            liveIds[id] = true;

            if (!this._fxEmitters[id]) {
                this._fxEmitters[id] = specs.map(function(s){ return new Emitter(s); });
            }
            var baseX = ev.screenX();
            var baseY = ev.screenY();
            var self = this;
            this._fxEmitters[id].forEach(function(em){
                var sx = baseX + em.spec.ox;
                var sy = baseY + em.spec.oy;
                em.update(sx, sy, self._fxContainer);

                if (DEBUG_MARKERS) {
                    if (!em._marker) {
                        var color = em.spec.type === 'steam' ? 'cyan' : 'red';
                        var mk = new Bitmap(6, 6);
                        mk._context.fillStyle = color;
                        mk._context.fillRect(0, 0, 6, 6);
                        if (mk._setDirty) mk._setDirty();
                        em._marker = new Sprite(mk);
                        em._marker.anchor.x = 0.5; em._marker.anchor.y = 0.5;
                        self._fxContainer.addChild(em._marker);
                    }
                    em._marker.x = sx;
                    em._marker.y = sy;
                }
            });
        }

        // 清理消失的事件
        for (var id in this._fxEmitters) {
            if (!liveIds[id]) {
                this._fxEmitters[id].forEach(function(em){ em.dispose(this._fxContainer); }, this);
                delete this._fxEmitters[id];
            }
        }
    };
})();
