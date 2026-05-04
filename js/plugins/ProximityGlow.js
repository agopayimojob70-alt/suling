/*:
 * @plugindesc 线索物品可交互指示 v4.0（朝向光标版）
 * @author Claude
 *
 * @help
 * 在事件的【备注】栏添加：
 *   <glow>                 启用默认白色指示
 *   <glow:255,200,80>      自定义 RGB 颜色（3 个数字，0-255）
 *
 * 位置微调（针对"事件格和物体视觉位置不重合"的情况）：
 *   <glowY:-64>            单独覆盖 Y 偏移（负数=上移）
 *   <glowX:12>             单独覆盖 X 偏移（负数=左移）
 * 例如煤炭画在事件格正上方一格，就写：
 *   <glow> <glowY:-80>
 *
 * 只有当玩家"站在事件相邻格 + 面朝该事件"时，
 * 事件上方会出现一个轻柔浮动的小箭头 ▾，
 * 提示"这里可以互动"。
 *
 * 比"靠近就发光"克制得多：
 * - 远处完全看不出
 * - 走近但没面朝也看不到
 * - 只有你真正准备互动的方向才会提示，不剧透线索位置
 *
 * @param Color
 * @text 颜色 R,G,B
 * @desc 指示箭头默认颜色（0-255，逗号分隔）
 * @default 255,245,220
 *
 * @param Size
 * @text 大小（像素）
 * @desc 箭头底边宽度，建议 14-24
 * @type number
 * @default 18
 *
 * @param Bob Amplitude
 * @text 浮动幅度
 * @desc 上下浮动范围（像素）
 * @type number
 * @default 3
 *
 * @param Bob Speed
 * @text 浮动速度
 * @desc 数值越大越快，建议 0.05-0.15
 * @default 0.1
 *
 * @param Fade In Frames
 * @text 淡入帧数
 * @desc 出现时的渐显帧数
 * @type number
 * @default 8
 *
 * @param Y Offset
 * @text Y 偏移
 * @desc 箭头相对事件的竖直偏移（负数上移）
 * @type number
 * @default -44
 *
 * @param Max Opacity
 * @text 最大不透明度
 * @desc 0-255
 * @type number
 * @min 0
 * @max 255
 * @default 220
 */

(function() {
    var params = PluginManager.parameters('ProximityGlow');
    var DEFAULT_COLOR = (params['Color'] || '255,245,220')
        .split(',').map(function(s){ return Number(s.trim()); });
    var SIZE = Number(params['Size'] || 18);
    var BOB_AMP = Number(params['Bob Amplitude'] || 3);
    var BOB_SPEED = Number(params['Bob Speed'] || 0.1);
    var FADE_IN = Number(params['Fade In Frames'] || 8);
    var Y_OFFSET = Number(params['Y Offset'] || -44);
    var MAX_OPACITY = Number(params['Max Opacity'] || 220);

    var bitmapCache = {};

    // 画一个带柔边的向下三角 ▾
    function getArrowBitmap(r, g, b) {
        var key = r + ',' + g + ',' + b;
        if (bitmapCache[key]) return bitmapCache[key];

        var pad = 6;
        var w = SIZE + pad * 2;
        var h = Math.round(SIZE * 0.8) + pad * 2;
        var bmp = new Bitmap(w, h);
        var ctx = bmp._context;

        // 外层光晕（柔边）
        ctx.shadowColor = 'rgba('+r+','+g+','+b+',0.9)';
        ctx.shadowBlur = 6;
        // 内核三角
        ctx.fillStyle = 'rgba('+r+','+g+','+b+',1)';
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad + SIZE, pad);
        ctx.lineTo(pad + SIZE / 2, pad + SIZE * 0.8);
        ctx.closePath();
        ctx.fill();

        // 描一层更亮的描边，让箭头在暗场景里更清楚
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (bmp._setDirty) bmp._setDirty();
        bitmapCache[key] = bmp;
        return bmp;
    }

    function parseColor(metaGlow) {
        if (typeof metaGlow === 'string' && metaGlow.indexOf(',') >= 0) {
            var parsed = metaGlow.split(',').map(function(s){ return Number(s.trim()); });
            if (parsed.length >= 3 && parsed.every(function(n){ return !isNaN(n); })) {
                return parsed;
            }
        }
        return DEFAULT_COLOR;
    }

    // 玩家是否正站在事件的相邻格 + 面朝事件
    function playerFacingEvent(ev) {
        var px = $gamePlayer.x;
        var py = $gamePlayer.y;
        var dir = $gamePlayer.direction();
        var tx = px, ty = py;
        switch (dir) {
            case 2: ty++; break; // 下
            case 4: tx--; break; // 左
            case 6: tx++; break; // 右
            case 8: ty--; break; // 上
        }
        return ev.x === tx && ev.y === ty;
    }

    // ---- Spriteset 扩展 ----
    var _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        this._arrowSprites = {};
        this._arrowFade = {};
        this._arrowContainer = new Sprite();
        this._tilemap.addChild(this._arrowContainer);
    };

    var _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        this.updateArrowSprites();
    };

    Spriteset_Map.prototype.updateArrowSprites = function() {
        if (!this._arrowContainer) return;

        var events = $gameMap.events();
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            if (!ev.event || ev._erased || !ev.event()) continue;
            var meta = ev.event().meta;
            if (meta.glow === undefined) continue;

            var id = ev.eventId();
            var show = playerFacingEvent(ev);

            if (!show) {
                // 淡出
                this._arrowFade[id] = Math.max(0, (this._arrowFade[id] || 0) - 1);
                var spr = this._arrowSprites[id];
                if (spr) {
                    if (this._arrowFade[id] === 0) {
                        spr.visible = false;
                    } else {
                        spr.visible = true;
                        spr.opacity = MAX_OPACITY * (this._arrowFade[id] / FADE_IN);
                    }
                }
                continue;
            }

            // 需要显示
            var color = parseColor(meta.glow);
            var sprite = this._arrowSprites[id];
            if (!sprite) {
                sprite = new Sprite(getArrowBitmap(color[0], color[1], color[2]));
                sprite.anchor.x = 0.5;
                sprite.anchor.y = 1;
                sprite._phase = 0;
                this._arrowContainer.addChild(sprite);
                this._arrowSprites[id] = sprite;
            }

            this._arrowFade[id] = Math.min(FADE_IN, (this._arrowFade[id] || 0) + 1);
            sprite._phase += BOB_SPEED;
            var bob = Math.sin(sprite._phase) * BOB_AMP;

            // 每事件独立覆盖 X/Y 偏移
            var ox = (meta.glowX !== undefined) ? Number(meta.glowX) : 0;
            var oy = (meta.glowY !== undefined) ? Number(meta.glowY) : Y_OFFSET;

            sprite.visible = true;
            sprite.x = ev.screenX() + ox;
            sprite.y = ev.screenY() + oy + bob;
            sprite.opacity = MAX_OPACITY * (this._arrowFade[id] / FADE_IN);
        }
    };

    var _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._arrowSprites = {};
        this._arrowFade = {};
    };
})();
