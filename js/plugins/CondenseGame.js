/*:
 * @plugindesc 能量凝聚小游戏 v1.0（按住蓄力 · 松开收手）
 * @author Claude
 *
 * @help
 * 插件指令：
 *   StartCondense [安全区宽度%] [需要成功次数] [总尝试次数]
 *   例: StartCondense 40 2 3  →  安全区占 40% 宽，3 次机会里成功 2 次算过关
 *
 * 玩法：
 *   按住空格键或鼠标左键，底部进度条开始从左向右充能。
 *   进度条上有一段金色"安全区"，当指针进入安全区时松开，记为成功。
 *   松开在空白区 = 失败一次。总共 N 次机会，达标即通关。
 *
 * 结果存入 变量 10：1=成功，2=失败。
 *
 * @param Safe Zone Width
 * @text 默认安全区宽度 (%)
 * @type number
 * @default 40
 *
 * @param Required Successes
 * @text 默认需要成功次数
 * @type number
 * @default 2
 *
 * @param Total Attempts
 * @text 默认总尝试次数
 * @type number
 * @default 3
 *
 * @param Fill Speed
 * @text 充能速度（百分比/秒）
 * @default 60
 *
 * @param Result Variable
 * @text 结果存入变量 ID
 * @type number
 * @default 10
 */

(function() {
    var P = PluginManager.parameters('CondenseGame');
    var DEFAULT_ZONE = Number(P['Safe Zone Width'] || 40);
    var DEFAULT_NEED = Number(P['Required Successes'] || 2);
    var DEFAULT_TRIES = Number(P['Total Attempts'] || 3);
    var FILL_SPEED_PCT_PER_SEC = Number(P['Fill Speed'] || 60);
    var RESULT_VAR = Number(P['Result Variable'] || 10);

    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'StartCondense') {
            var zone = Number(args[0]) || DEFAULT_ZONE;
            var need = Number(args[1]) || DEFAULT_NEED;
            var tries = Number(args[2]) || DEFAULT_TRIES;
            SceneManager.push(Scene_Condense);
            SceneManager.prepareNextScene(zone, need, tries);
        }
    };

    function Scene_Condense() { this.initialize.apply(this, arguments); }
    Scene_Condense.prototype = Object.create(Scene_Base.prototype);
    Scene_Condense.prototype.constructor = Scene_Condense;

    Scene_Condense.prototype.prepare = function(zone, need, tries) {
        this._zoneWidth = zone;
        this._needSuccess = need;
        this._totalTries = tries;
    };

    Scene_Condense.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this._successCount = 0;
        this._attemptCount = 0;
        this._progress = 0;           // 0-100
        this._holding = false;
        this._feedbackTimer = 0;
        this._feedbackType = null;    // 'success' | 'fail'
        this._ended = false;
        this._endTimer = 0;
        this._phase = 0;
        this._particles = [];
        this.rollZonePosition();

        this.createBackground();
        this.createOrb();
        this.createLayers();
    };

    Scene_Condense.prototype.rollZonePosition = function() {
        // 每次尝试，安全区在进度条 30%-90% 区间随机位置
        var max = 100 - this._zoneWidth;
        var min = 20;
        this._zoneStart = min + Math.random() * (max - min);
    };

    Scene_Condense.prototype.createBackground = function() {
        var bmp = new Bitmap(Graphics.width, Graphics.height);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(
            Graphics.width/2, Graphics.height/2 - 60, 0,
            Graphics.width/2, Graphics.height/2 - 60, Graphics.width/1.3
        );
        grad.addColorStop(0, 'rgba(40, 15, 60, 1)');
        grad.addColorStop(1, 'rgba(5, 2, 15, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, Graphics.width, Graphics.height);
        bmp._setDirty && bmp._setDirty();
        this._bg = new Sprite(bmp);
        this.addChild(this._bg);
    };

    Scene_Condense.prototype.createOrb = function() {
        var size = 320;
        var bmp = new Bitmap(size, size);
        var ctx = bmp._context;
        var grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grad.addColorStop(0, 'rgba(255, 230, 255, 1)');
        grad.addColorStop(0.25, 'rgba(200, 160, 255, 0.9)');
        grad.addColorStop(0.6, 'rgba(120, 60, 200, 0.4)');
        grad.addColorStop(1, 'rgba(40, 10, 80, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        bmp._setDirty && bmp._setDirty();
        this._orb = new Sprite(bmp);
        this._orb.anchor.x = 0.5;
        this._orb.anchor.y = 0.5;
        this._orb.x = Graphics.boxWidth / 2;
        this._orb.y = Graphics.boxHeight / 2 - 60;
        this._orb.blendMode = PIXI.BLEND_MODES.ADD;
        this.addChild(this._orb);
    };

    Scene_Condense.prototype.createLayers = function() {
        this._fxBmp = new Bitmap(Graphics.width, Graphics.height);
        this._fxSprite = new Sprite(this._fxBmp);
        this.addChild(this._fxSprite);
        this._uiBmp = new Bitmap(Graphics.width, Graphics.height);
        this._uiSprite = new Sprite(this._uiBmp);
        this.addChild(this._uiSprite);
    };

    Scene_Condense.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        if (this._ended) { this.updateEnd(); return; }
        this._phase += 0.06;

        if (this._feedbackTimer > 0) {
            this._feedbackTimer--;
            if (this._feedbackTimer === 0) this.nextAttempt();
        } else {
            this.handleInput();
            if (this._holding) {
                this._progress += FILL_SPEED_PCT_PER_SEC / 60;
                if (this._progress >= 100) {
                    // 填满但没松手 = 爆炸失败
                    this.resolveAttempt(false, '过载');
                }
            }
        }
        this.updateOrbVisual();
        this.drawFX();
        this.drawUI();
    };

    Scene_Condense.prototype.handleInput = function() {
        var pressed = Input.isPressed('ok') || TouchInput.isPressed();
        if (pressed && !this._holding) {
            this._holding = true;
        } else if (!pressed && this._holding) {
            // 松开
            this._holding = false;
            var inZone = (this._progress >= this._zoneStart && this._progress <= this._zoneStart + this._zoneWidth);
            this.resolveAttempt(inZone, inZone ? null : '偏差');
        }
    };

    Scene_Condense.prototype.resolveAttempt = function(success, failReason) {
        this._attemptCount++;
        if (success) {
            this._successCount++;
            this._feedbackType = 'success';
            this.spawnParticles(true);
            AudioManager.playSe({ name: 'Flash2', volume: 80, pitch: 100, pan: 0 });
        } else {
            this._feedbackType = 'fail';
            this._failReason = failReason || '偏差';
            this.spawnParticles(false);
            AudioManager.playSe({ name: 'Damage1', volume: 70, pitch: 100, pan: 0 });
        }
        this._feedbackTimer = 50;
    };

    Scene_Condense.prototype.spawnParticles = function(success) {
        for (var i = 0; i < 20; i++) {
            var ang = Math.random() * Math.PI * 2;
            var spd = 3 + Math.random() * 4;
            this._particles.push({
                x: this._orb.x, y: this._orb.y,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                life: 0, maxLife: 30 + Math.random() * 20,
                color: success ? [220, 255, 200] : [255, 140, 140]
            });
        }
    };

    Scene_Condense.prototype.nextAttempt = function() {
        this._progress = 0;
        this._feedbackType = null;
        if (this._successCount >= this._needSuccess) {
            this.endGame(true);
        } else if (this._attemptCount >= this._totalTries) {
            this.endGame(false);
        } else {
            this.rollZonePosition();
        }
    };

    Scene_Condense.prototype.updateOrbVisual = function() {
        // 按住时球放大 + 旋转
        var base = 1 + Math.sin(this._phase) * 0.04;
        var charge = this._holding ? (this._progress / 100) * 0.3 : 0;
        var s = base + charge;
        this._orb.scale.x = this._orb.scale.y = s;
        this._orb.opacity = 200 + (this._holding ? this._progress * 0.5 : 0);
        this._orb.rotation += this._holding ? 0.04 : 0.008;
    };

    Scene_Condense.prototype.drawFX = function() {
        var bmp = this._fxBmp;
        bmp.clear();
        var ctx = bmp._context;
        // 更新粒子
        for (var i = this._particles.length - 1; i >= 0; i--) {
            var p = this._particles[i];
            p.life++;
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.1;
            var t = p.life / p.maxLife;
            ctx.fillStyle = 'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',' + (1-t) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
            if (p.life >= p.maxLife) this._particles.splice(i, 1);
        }
        bmp._setDirty && bmp._setDirty();
    };

    Scene_Condense.prototype.drawUI = function() {
        var bmp = this._uiBmp;
        bmp.clear();
        var ctx = bmp._context;
        // 顶部信息
        bmp.fontSize = 22;
        bmp.textColor = '#eae4ff';
        bmp.outlineColor = '#000';
        bmp.outlineWidth = 4;
        bmp.drawText('能量凝聚装置', 0, 30, Graphics.width, 28, 'center');
        bmp.fontSize = 18;
        bmp.textColor = '#aaa';
        bmp.drawText('尝试 ' + (this._attemptCount + (this._feedbackTimer > 0 ? 0 : 1)) + ' / ' + this._totalTries +
            '  ·  成功 ' + this._successCount + ' / ' + this._needSuccess,
            0, 62, Graphics.width, 22, 'center');

        // 进度条（下方）
        var barW = 600, barH = 28;
        var bx = (Graphics.width - barW) / 2;
        var by = Graphics.height - 140;

        // 底色
        ctx.fillStyle = 'rgba(40, 20, 60, 0.8)';
        ctx.fillRect(bx, by, barW, barH);

        // 安全区（金色）
        var zoneX = bx + barW * this._zoneStart / 100;
        var zoneW = barW * this._zoneWidth / 100;
        var zoneGrad = ctx.createLinearGradient(zoneX, 0, zoneX + zoneW, 0);
        zoneGrad.addColorStop(0, 'rgba(255, 200, 80, 0.35)');
        zoneGrad.addColorStop(0.5, 'rgba(255, 230, 150, 0.55)');
        zoneGrad.addColorStop(1, 'rgba(255, 200, 80, 0.35)');
        ctx.fillStyle = zoneGrad;
        ctx.fillRect(zoneX, by, zoneW, barH);
        ctx.strokeStyle = 'rgba(255, 220, 120, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(zoneX, by, zoneW, barH);

        // 当前进度（紫色液体）
        var progX = bx + barW * this._progress / 100;
        var fillGrad = ctx.createLinearGradient(bx, 0, progX, 0);
        fillGrad.addColorStop(0, 'rgba(100, 60, 180, 0.9)');
        fillGrad.addColorStop(1, 'rgba(200, 150, 255, 0.9)');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(bx, by, progX - bx, barH);

        // 指针
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(progX, by - 8);
        ctx.lineTo(progX - 6, by + 2);
        ctx.lineTo(progX + 6, by + 2);
        ctx.closePath();
        ctx.fill();

        // 边框
        ctx.strokeStyle = 'rgba(180, 160, 220, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, barW, barH);

        // 提示
        bmp.fontSize = 16;
        bmp.textColor = '#ccc';
        bmp.drawText('按住空格 / 鼠标 充能 · 指针进入金色安全区时松开',
            0, by + barH + 16, Graphics.width, 20, 'center');

        // 反馈
        if (this._feedbackTimer > 0) {
            var alpha = this._feedbackTimer / 50;
            ctx.fillStyle = this._feedbackType === 'success'
                ? 'rgba(80, 220, 120, ' + (0.3 * alpha) + ')'
                : 'rgba(220, 80, 80, ' + (0.25 * alpha) + ')';
            ctx.fillRect(0, 0, Graphics.width, Graphics.height);
            bmp.fontSize = 40;
            bmp.textColor = this._feedbackType === 'success' ? '#bbffcc' : '#ffb0b0';
            bmp.outlineColor = '#000';
            bmp.outlineWidth = 5;
            var msg = this._feedbackType === 'success' ? '凝聚成功' : ('凝聚失败 · ' + (this._failReason || '偏差'));
            bmp.drawText(msg, 0, 200, Graphics.width, 50, 'center');
        }

        bmp._setDirty && bmp._setDirty();
    };

    Scene_Condense.prototype.endGame = function(success) {
        this._ended = true;
        this._success = success;
        this._endTimer = 0;
        $gameVariables.setValue(RESULT_VAR, success ? 1 : 2);
        AudioManager.playSe({
            name: success ? 'Absorb1' : 'Buzzer1', volume: 90, pitch: 100, pan: 0
        });
    };

    Scene_Condense.prototype.updateEnd = function() {
        this._endTimer++;
        var bmp = this._uiBmp;
        bmp.clear();
        var ctx = bmp._context;
        ctx.fillStyle = this._success ? 'rgba(20,50,30,0.9)' : 'rgba(60,10,10,0.9)';
        ctx.fillRect(0, 0, Graphics.width, Graphics.height);
        bmp.fontSize = 44;
        bmp.textColor = this._success ? '#b0ffc0' : '#ff9090';
        bmp.outlineColor = '#000';
        bmp.outlineWidth = 5;
        var title = this._success ? '能量液萃取 · 完成' : '装置过载 · 失败';
        bmp.drawText(title, 0, Graphics.height/2 - 40, Graphics.width, 50, 'center');
        bmp.fontSize = 18;
        bmp.textColor = '#ddd';
        var sub = this._success
            ? '成功 ' + this._successCount + ' / ' + this._needSuccess + '  ·  记忆碎片损失 +2.1%'
            : '凝聚稳定度不足，请重试';
        bmp.drawText(sub, 0, Graphics.height/2 + 20, Graphics.width, 24, 'center');
        bmp._setDirty && bmp._setDirty();
        if (this._endTimer > 90) SceneManager.pop();
    };
})();
