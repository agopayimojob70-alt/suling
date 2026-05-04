/*:
 * @plugindesc 灵魂牵引小游戏 v1.0（拖拽光魂到容器）
 * @author Claude
 *
 * @help
 * 插件指令：
 *   StartSoulGuide [光魂数量] [时限秒]
 *   例: StartSoulGuide 3 30  →  3 颗光魂，30 秒内全部拖入容器
 *
 * 玩法：
 *   屏幕左侧一个剪影源点，飘出几颗紫色光魂。玩家用鼠标按住拖拽
 *   每颗光魂到右侧容器内松开即可收集。光魂会自行缓慢漂移但拖拽时
 *   会跟随鼠标。全部收集完成算成功。（几乎不会失败，重点是氛围仪式感）
 *
 * 结果存入 变量 10：1=成功，2=失败（仅超时才失败）。
 *
 * @param Orb Count
 * @text 默认光魂数量
 * @type number
 * @default 3
 *
 * @param Time Limit
 * @text 默认时限（秒）
 * @type number
 * @default 30
 *
 * @param Result Variable
 * @text 结果存入变量 ID
 * @type number
 * @default 10
 */

(function() {
    var P = PluginManager.parameters('SoulGuideGame');
    var DEFAULT_ORBS = Number(P['Orb Count'] || 3);
    var DEFAULT_TIME = Number(P['Time Limit'] || 30);
    var RESULT_VAR = Number(P['Result Variable'] || 10);

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'StartSoulGuide') {
            var orbs = Number(args[0]) || DEFAULT_ORBS;
            var time = Number(args[1]) || DEFAULT_TIME;
            SceneManager.push(Scene_SoulGuide);
            SceneManager.prepareNextScene(orbs, time);
        }
    };

    function Scene_SoulGuide() { this.initialize.apply(this, arguments); }
    Scene_SoulGuide.prototype = Object.create(Scene_Base.prototype);
    Scene_SoulGuide.prototype.constructor = Scene_SoulGuide;

    Scene_SoulGuide.prototype.prepare = function(orbs, timeSec) {
        this._orbCount = orbs;
        this._timeLeft = timeSec * 60;
    };

    Scene_SoulGuide.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this._phase = 0;
        this._orbs = [];
        this._ended = false;
        this._endTimer = 0;
        this._draggedOrb = null;
        this._collected = 0;
        this._sourceX = 180;
        this._sourceY = Graphics.boxHeight / 2;
        this._containerX = Graphics.boxWidth - 200;
        this._containerY = Graphics.boxHeight / 2;
        this._containerR = 80;

        this.createBackground();
        this.createLayers();
        this.spawnOrbs();
    };

    Scene_SoulGuide.prototype.createBackground = function() {
        var bmp = new Bitmap(Graphics.width, Graphics.height);
        var ctx = bmp._context;
        var grad = ctx.createLinearGradient(0, 0, Graphics.width, 0);
        grad.addColorStop(0, 'rgba(20, 5, 40, 1)');
        grad.addColorStop(0.5, 'rgba(30, 10, 60, 1)');
        grad.addColorStop(1, 'rgba(20, 5, 40, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, Graphics.width, Graphics.height);
        bmp._setDirty && bmp._setDirty();
        this._bg = new Sprite(bmp);
        this.addChild(this._bg);
    };

    Scene_SoulGuide.prototype.createLayers = function() {
        this._fxBmp = new Bitmap(Graphics.width, Graphics.height);
        this._fxSprite = new Sprite(this._fxBmp);
        this.addChild(this._fxSprite);
        this._uiBmp = new Bitmap(Graphics.width, Graphics.height);
        this._uiSprite = new Sprite(this._uiBmp);
        this.addChild(this._uiSprite);
    };

    Scene_SoulGuide.prototype.spawnOrbs = function() {
        // 构建光魂位图（缓存）
        var size = 40;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grad.addColorStop(0, 'rgba(255, 230, 255, 1)');
        grad.addColorStop(0.4, 'rgba(200, 150, 255, 0.85)');
        grad.addColorStop(1, 'rgba(100, 50, 200, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        bmp._setDirty && bmp._setDirty();
        this._orbBmp = bmp;

        for (var i = 0; i < this._orbCount; i++) {
            var s = new Sprite(bmp);
            s.anchor.x = 0.5; s.anchor.y = 0.5;
            s.blendMode = PIXI.BLEND_MODES.ADD;
            s.x = this._sourceX + 20;
            s.y = this._sourceY + (Math.random() - 0.5) * 40;
            this.addChild(s);
            this._orbs.push({
                sprite: s,
                x: s.x, y: s.y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.5,
                phase: Math.random() * Math.PI * 2,
                collected: false,
                dragging: false,
                trail: []
            });
        }
    };

    Scene_SoulGuide.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        if (this._ended) { this.updateEnd(); return; }
        this._phase += 0.03;
        this._timeLeft--;

        this.handleInput();
        this.updateOrbs();
        this.drawFX();
        this.drawUI();

        if (this._collected >= this._orbCount) this.endGame(true);
        if (this._timeLeft <= 0) this.endGame(this._collected >= this._orbCount);
    };

    Scene_SoulGuide.prototype.getOrbUnderMouse = function() {
        var mx = TouchInput.x, my = TouchInput.y;
        for (var i = this._orbs.length - 1; i >= 0; i--) {
            var o = this._orbs[i];
            if (o.collected) continue;
            var dx = mx - o.x, dy = my - o.y;
            if (dx*dx + dy*dy < 35*35) return o;
        }
        return null;
    };

    Scene_SoulGuide.prototype.handleInput = function() {
        if (TouchInput.isTriggered()) {
            var hit = this.getOrbUnderMouse();
            if (hit) {
                this._draggedOrb = hit;
                hit.dragging = true;
            }
        }
        if (this._draggedOrb) {
            this._draggedOrb.x = TouchInput.x;
            this._draggedOrb.y = TouchInput.y;
            if (TouchInput.isReleased()) {
                var o = this._draggedOrb;
                // 判断是否在容器内
                var dx = o.x - this._containerX;
                var dy = o.y - this._containerY;
                if (dx*dx + dy*dy < this._containerR * this._containerR) {
                    o.collected = true;
                    o.sprite.visible = false;
                    this._collected++;
                    AudioManager.playSe({ name: 'Absorb1', volume: 60, pitch: 120, pan: 0 });
                } else {
                    // 回弹速度
                    o.vx = (Math.random() - 0.5) * 1;
                    o.vy = (Math.random() - 0.5) * 1;
                }
                o.dragging = false;
                this._draggedOrb = null;
            }
        }
    };

    Scene_SoulGuide.prototype.updateOrbs = function() {
        for (var i = 0; i < this._orbs.length; i++) {
            var o = this._orbs[i];
            if (o.collected) continue;
            if (!o.dragging) {
                // 自由漂浮 + 朝向中心轻微吸引（避免飘出界外）
                var cx = Graphics.boxWidth / 2;
                var cy = Graphics.boxHeight / 2;
                o.vx += (cx - o.x) * 0.0003;
                o.vy += (cy - o.y) * 0.0003;
                o.vx *= 0.99; o.vy *= 0.99;
                o.phase += 0.05;
                o.x += o.vx + Math.sin(o.phase) * 0.3;
                o.y += o.vy + Math.cos(o.phase * 0.7) * 0.3;
                o.x = Math.max(30, Math.min(Graphics.boxWidth - 30, o.x));
                o.y = Math.max(60, Math.min(Graphics.boxHeight - 100, o.y));
            }
            o.sprite.x = o.x;
            o.sprite.y = o.y;
            o.sprite.rotation += 0.02;
            // 拖动时放大一点
            var scale = o.dragging ? 1.4 : 1.0;
            o.sprite.scale.x = o.sprite.scale.y = scale;
            // 拖尾
            o.trail.push({x: o.x, y: o.y});
            if (o.trail.length > 12) o.trail.shift();
        }
    };

    Scene_SoulGuide.prototype.drawFX = function() {
        var bmp = this._fxBmp;
        bmp.clear();
        var ctx = bmp._context;
        // 源点：剪影柱
        var sx = this._sourceX, sy = this._sourceY;
        var grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 80);
        grad.addColorStop(0, 'rgba(150, 100, 220, 0.6)');
        grad.addColorStop(1, 'rgba(150, 100, 220, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 80, sy - 80, 160, 160);
        // 源点：站立人影轮廓
        ctx.fillStyle = 'rgba(40, 20, 60, 0.9)';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 40, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(sx - 22, sy - 20, 44, 60);
        ctx.fillRect(sx - 16, sy + 40, 32, 40);
        // 容器（右侧）
        var ccx = this._containerX, ccy = this._containerY, cr = this._containerR;
        // 外圈发光
        var g2 = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, cr + 20);
        g2.addColorStop(0, 'rgba(255, 200, 100, ' + (0.2 + Math.sin(this._phase * 2) * 0.1) + ')');
        g2.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(ccx - cr - 20, ccy - cr - 20, (cr+20)*2, (cr+20)*2);
        // 容器本体
        ctx.strokeStyle = 'rgba(255, 220, 140, 0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 220, 140, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 容器内已收集的光点
        ctx.fillStyle = 'rgba(200, 160, 255, 0.5)';
        for (var i = 0; i < this._collected; i++) {
            var a = i * (Math.PI * 2 / this._orbCount) + this._phase;
            var r = cr * 0.55;
            ctx.beginPath();
            ctx.arc(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        // 光魂拖尾
        for (var i = 0; i < this._orbs.length; i++) {
            var o = this._orbs[i];
            if (o.collected) continue;
            for (var j = 0; j < o.trail.length; j++) {
                var t = j / o.trail.length;
                ctx.fillStyle = 'rgba(200, 160, 255, ' + (t * 0.4) + ')';
                ctx.beginPath();
                ctx.arc(o.trail[j].x, o.trail[j].y, 3 * t, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        bmp._setDirty && bmp._setDirty();
    };

    Scene_SoulGuide.prototype.drawUI = function() {
        var bmp = this._uiBmp;
        bmp.clear();
        var ctx = bmp._context;
        bmp.fontSize = 22;
        bmp.textColor = '#eae4ff';
        bmp.outlineColor = '#000';
        bmp.outlineWidth = 4;
        bmp.drawText('灵魂牵引 · 剩余时间 ' + Math.ceil(this._timeLeft / 60) + ' 秒',
            0, 30, Graphics.width, 28, 'center');
        bmp.fontSize = 18;
        bmp.textColor = '#aaa';
        bmp.drawText('已收集 ' + this._collected + ' / ' + this._orbCount,
            0, 62, Graphics.width, 22, 'center');
        bmp.fontSize = 16;
        bmp.textColor = '#999';
        bmp.drawText('[按住鼠标 拖拽光魂到右侧容器]',
            0, Graphics.height - 40, Graphics.width, 20, 'center');
        bmp._setDirty && bmp._setDirty();
    };

    Scene_SoulGuide.prototype.endGame = function(success) {
        this._ended = true;
        this._success = success;
        this._endTimer = 0;
        $gameVariables.setValue(RESULT_VAR, success ? 1 : 2);
        AudioManager.playSe({
            name: success ? 'Absorb1' : 'Buzzer1', volume: 90, pitch: 100, pan: 0
        });
    };

    Scene_SoulGuide.prototype.updateEnd = function() {
        this._endTimer++;
        var bmp = this._uiBmp;
        bmp.clear();
        var ctx = bmp._context;
        ctx.fillStyle = this._success ? 'rgba(30, 40, 60, 0.9)' : 'rgba(60, 15, 15, 0.9)';
        ctx.fillRect(0, 0, Graphics.width, Graphics.height);
        bmp.fontSize = 44;
        bmp.textColor = this._success ? '#c8ddff' : '#ff9090';
        bmp.outlineColor = '#000';
        bmp.outlineWidth = 5;
        bmp.drawText(this._success ? '能量液萃取 · 完成' : '光魂逸散 · 失败',
            0, Graphics.height/2 - 40, Graphics.width, 50, 'center');
        bmp.fontSize = 18;
        bmp.textColor = '#ddd';
        bmp.drawText(this._collected + ' / ' + this._orbCount + ' 光魂已收集',
            0, Graphics.height/2 + 20, Graphics.width, 24, 'center');
        bmp._setDirty && bmp._setDirty();
        if (this._endTimer > 80) SceneManager.pop();
    };
})();
