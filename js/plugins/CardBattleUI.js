/*:
 * @plugindesc 卡牌战斗 UI 强化 v1.0
 * @author Claude
 *
 * @help
 * 为自定义卡牌战斗系统（用公共事件+Picture 搭建）加上：
 *   1. 敌人意图：每个存活敌人头顶显示 ⚔ + 攻击力数字
 *   2. 抽牌堆/弃牌堆美化面板：图标 + 边框（读变量 43/44）
 *   3. 选中卡发光：选中手牌时外框加紫色呼吸光
 *   4. 结束按钮边框：Picture 100 四周加装饰
 *
 * 系统假设（基于你项目的实际配置）：
 *   - 手牌 Picture ID 范围：11-40
 *   - 抽牌堆数量变量：43
 *   - 弃牌堆数量变量：44
 *   - 选中卡索引全局变量：window.chooseCard
 *   - 手牌数组全局变量：window.handCard
 *   - 结束按钮 Picture ID：100
 *
 * @param Enable Intent
 * @text 敌人意图
 * @type boolean
 * @default false
 *
 * @param Intent Y Offset
 * @text 意图图标 Y 偏移
 * @desc 相对敌人头顶的 Y 偏移（负数上移）
 * @type number
 * @default -20
 *
 * @param Enable Pile Panel
 * @text 抽牌堆美化面板
 * @type boolean
 * @default true
 *
 * @param Pile Panel X
 * @text 面板 X
 * @type number
 * @default 834
 *
 * @param Pile Panel Y
 * @text 面板 Y
 * @type number
 * @default 20
 *
 * @param Draw Pile Var
 * @text 抽牌堆变量 ID
 * @type number
 * @default 43
 *
 * @param Discard Pile Var
 * @text 弃牌堆变量 ID
 * @type number
 * @default 44
 *
 * @param Enable Card Glow
 * @text 选中卡发光
 * @type boolean
 * @default true
 *
 * @param Card Picture Range Start
 * @text 手牌 Picture 起始 ID
 * @type number
 * @default 11
 *
 * @param Card Picture Range End
 * @text 手牌 Picture 结束 ID
 * @type number
 * @default 40
 *
 * @param Enable End Turn Frame
 * @text 结束按钮边框
 * @type boolean
 * @default true
 *
 * @param End Turn Picture ID
 * @text 结束按钮 Picture ID
 * @type number
 * @default 100
 *
 * @param Hide Default Status
 * @text 隐藏默认状态栏
 * @desc 隐藏战斗底部的 Window_BattleStatus（HP/MP/TP 那条）
 * @type boolean
 * @default true
 *
 * @param Custom Status Panel
 * @text 自定义状态面板
 * @desc 在底部画一条暗紫银符文风格的状态条（名字+HP/MP/TP）
 * @type boolean
 * @default true
 *
 * @param Status Panel Y Offset
 * @text 状态面板 Y 偏移
 * @desc 从底部向上的距离（像素）
 * @type number
 * @default 10
 *
 * @param Status Class Label
 * @text 职业小标签
 * @desc 显示在名字下方的一小行（留空则不显示）
 * @type string
 * @default 灵媒
 */

(function() {
    var P = PluginManager.parameters('CardBattleUI');
    var EN_INTENT = (P['Enable Intent'] || 'true') === 'true';
    var INTENT_Y = Number(P['Intent Y Offset'] || -20);
    var EN_PILE = (P['Enable Pile Panel'] || 'true') === 'true';
    var PILE_X = Number(P['Pile Panel X'] === undefined ? 834 : P['Pile Panel X']);
    var PILE_Y = Number(P['Pile Panel Y'] === undefined ? 20 : P['Pile Panel Y']);
    var V_DRAW = Number(P['Draw Pile Var'] || 43);
    var V_DISCARD = Number(P['Discard Pile Var'] || 44);
    var EN_GLOW = (P['Enable Card Glow'] || 'true') === 'true';
    var CARD_PIC_MIN = Number(P['Card Picture Range Start'] || 11);
    var CARD_PIC_MAX = Number(P['Card Picture Range End'] || 40);
    var EN_END_FRAME = (P['Enable End Turn Frame'] || 'true') === 'true';
    var END_PIC_ID = Number(P['End Turn Picture ID'] || 100);
    var HIDE_STATUS = (P['Hide Default Status'] || 'true') === 'true';
    var CUSTOM_STATUS = (P['Custom Status Panel'] || 'true') === 'true';
    var STATUS_Y_OFFSET = Number(P['Status Panel Y Offset'] || 10);
    var STATUS_CLASS = (P['Status Class Label'] === undefined ? '灵媒' : String(P['Status Class Label']));

    // ===== 1. 敌人意图显示 =====
    function createIntentBitmap(atkValue) {
        var w = 68, h = 32;
        var bmp = new Bitmap(w, h);
        var ctx = bmp._context;
        // 背景圆角半透明
        ctx.fillStyle = 'rgba(30,15,15,0.82)';
        roundRect(ctx, 0, 0, w, h, 6);
        ctx.fill();
        // 边框
        ctx.strokeStyle = 'rgba(255,120,120,0.9)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 0.5, 0.5, w-1, h-1, 6);
        ctx.stroke();
        // 剑图标（简单三角+十字）
        ctx.fillStyle = '#ff9090';
        ctx.beginPath();
        ctx.moveTo(8, 22);
        ctx.lineTo(14, 22);
        ctx.lineTo(20, 8);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(5, 22, 13, 2);
        ctx.fillRect(6, 24, 11, 3);
        // 数字
        bmp.textColor = '#ffe6b3';
        bmp.outlineColor = '#000000';
        bmp.outlineWidth = 3;
        bmp.fontSize = 20;
        bmp.drawText(String(atkValue), 26, 2, 38, h-4, 'left');
        if (bmp._setDirty) bmp._setDirty();
        return bmp;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
    }

    if (EN_INTENT) {
        var _Spriteset_Battle_createLowerLayer = Spriteset_Battle.prototype.createLowerLayer;
        Spriteset_Battle.prototype.createLowerLayer = function() {
            _Spriteset_Battle_createLowerLayer.call(this);
            this._intentSprites = {};
            this._intentContainer = new Sprite();
            this.addChild(this._intentContainer);
        };

        var _Spriteset_Battle_update = Spriteset_Battle.prototype.update;
        Spriteset_Battle.prototype.update = function() {
            _Spriteset_Battle_update.call(this);
            this.updateEnemyIntents();
        };

        Spriteset_Battle.prototype.updateEnemyIntents = function() {
            if (!this._intentContainer) return;
            var live = {};
            var enemies = $gameTroop.members();
            for (var i = 0; i < enemies.length; i++) {
                var enemy = enemies[i];
                if (!enemy.isAlive()) continue;
                var sprite = this._enemySprites[i];
                if (!sprite) continue;

                var atk = enemy.atk;
                var key = i;
                live[key] = true;

                var intentSpr = this._intentSprites[key];
                if (!intentSpr || intentSpr._lastAtk !== atk) {
                    if (intentSpr) this._intentContainer.removeChild(intentSpr);
                    intentSpr = new Sprite(createIntentBitmap(atk));
                    intentSpr.anchor.x = 0.5;
                    intentSpr.anchor.y = 1;
                    intentSpr._lastAtk = atk;
                    this._intentContainer.addChild(intentSpr);
                    this._intentSprites[key] = intentSpr;
                }
                intentSpr.x = sprite.x;
                intentSpr.y = sprite.y - (sprite.bitmap ? sprite.bitmap.height : 100) + INTENT_Y;
                // 轻微上下浮动
                intentSpr._phase = (intentSpr._phase || 0) + 0.04;
                intentSpr.y += Math.sin(intentSpr._phase) * 2;
            }
            // 清理已死
            for (var key in this._intentSprites) {
                if (!live[key]) {
                    this._intentContainer.removeChild(this._intentSprites[key]);
                    delete this._intentSprites[key];
                }
            }
        };
    }

    // ===== 2. 抽/弃牌堆美化面板 =====
    function createPilePanelBitmap(draw, discard) {
        var w = 170, h = 56;
        var bmp = new Bitmap(w, h);
        var ctx = bmp._context;
        // 背景
        ctx.fillStyle = 'rgba(18,14,30,0.85)';
        roundRect(ctx, 0, 0, w, h, 8);
        ctx.fill();
        // 边框
        ctx.strokeStyle = 'rgba(180,160,220,0.7)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 0.5, 0.5, w-1, h-1, 8);
        ctx.stroke();
        // 分隔线
        ctx.strokeStyle = 'rgba(180,160,220,0.3)';
        ctx.beginPath();
        ctx.moveTo(w/2, 8);
        ctx.lineTo(w/2, h-8);
        ctx.stroke();
        // 左：抽牌堆图标（一叠卡牌）
        drawDeckIcon(ctx, 14, 14, '#9cb0ff');
        // 右：弃牌堆图标（飞散卡牌）
        drawDiscardIcon(ctx, w/2 + 14, 14, '#c88888');
        // 数字
        bmp.fontSize = 22;
        bmp.textColor = '#f0e9d8';
        bmp.outlineColor = '#000000';
        bmp.outlineWidth = 3;
        bmp.drawText(String(draw), 44, 12, 40, 32, 'left');
        bmp.drawText(String(discard), w/2 + 44, 12, 40, 32, 'left');
        if (bmp._setDirty) bmp._setDirty();
        return bmp;
    }
    function drawDeckIcon(ctx, x, y, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        // 三张叠起来
        for (var i = 2; i >= 0; i--) {
            var ox = i * 2, oy = i * 2;
            ctx.fillStyle = 'rgba(40,40,70,0.8)';
            ctx.fillRect(x + ox, y + oy, 18, 24);
            ctx.strokeRect(x + ox + 0.5, y + oy + 0.5, 18, 24);
        }
    }
    function drawDiscardIcon(ctx, x, y, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        // 一张倒下的
        ctx.save();
        ctx.translate(x + 6, y + 12);
        ctx.rotate(-0.35);
        ctx.fillStyle = 'rgba(40,25,25,0.7)';
        ctx.fillRect(0, 0, 18, 24);
        ctx.strokeRect(0.5, 0.5, 18, 24);
        ctx.restore();
        // 一张正的
        ctx.save();
        ctx.translate(x + 8, y + 4);
        ctx.rotate(0.2);
        ctx.fillStyle = 'rgba(40,25,25,0.7)';
        ctx.fillRect(0, 0, 18, 24);
        ctx.strokeRect(0.5, 0.5, 18, 24);
        ctx.restore();
    }

    if (EN_PILE) {
        var _Scene_Battle_createSpriteset = Scene_Battle.prototype.createSpriteset;
        Scene_Battle.prototype.createSpriteset = function() {
            _Scene_Battle_createSpriteset.call(this);
            this._pilePanelSprite = new Sprite();
            this._pilePanelSprite.x = PILE_X;
            this._pilePanelSprite.y = PILE_Y;
            this.addChild(this._pilePanelSprite);
        };

        var _Scene_Battle_update = Scene_Battle.prototype.update;
        Scene_Battle.prototype.update = function() {
            _Scene_Battle_update.call(this);
            this.updatePilePanel();
        };

        Scene_Battle.prototype.updatePilePanel = function() {
            if (!this._pilePanelSprite) return;
            var draw = $gameVariables.value(V_DRAW);
            var disc = $gameVariables.value(V_DISCARD);
            if (this._pilePanelSprite._cached !== draw + ',' + disc) {
                this._pilePanelSprite.bitmap = createPilePanelBitmap(draw, disc);
                this._pilePanelSprite._cached = draw + ',' + disc;
            }
        };
    }

    // ===== 3. 选中卡发光 =====
    if (EN_GLOW) {
        var _Sprite_Picture_updateBitmap = Sprite_Picture.prototype.updateBitmap;
        Sprite_Picture.prototype.updateBitmap = function() {
            _Sprite_Picture_updateBitmap.call(this);
            this.updateCardGlow();
        };

        Sprite_Picture.prototype.updateCardGlow = function() {
            var id = this._pictureId;
            if (id < CARD_PIC_MIN || id > CARD_PIC_MAX) {
                if (this._cardGlowOn) {
                    this.setBlendColor([0,0,0,0]);
                    this._cardGlowOn = false;
                }
                return;
            }
            var cardIdx = id - CARD_PIC_MIN;
            var isSelected = (typeof window.chooseCard === 'number' && window.chooseCard === cardIdx);
            if (isSelected) {
                this._cardGlowPhase = (this._cardGlowPhase || 0) + 0.12;
                var intensity = (Math.sin(this._cardGlowPhase) + 1) * 0.5;
                var alpha = 60 + intensity * 80;
                this.setBlendColor([200, 170, 255, alpha]);
                this._cardGlowOn = true;
            } else if (this._cardGlowOn) {
                this.setBlendColor([0,0,0,0]);
                this._cardGlowOn = false;
            }
        };
    }

    // ===== 4. 结束按钮装饰边框 =====
    if (EN_END_FRAME) {
        var _Sprite_Picture_update = Sprite_Picture.prototype.update;
        Sprite_Picture.prototype.update = function() {
            _Sprite_Picture_update.call(this);
            this.updateEndTurnFrame();
        };

        Sprite_Picture.prototype.updateEndTurnFrame = function() {
            if (this._pictureId !== END_PIC_ID) return;
            if (!this.bitmap || !this.bitmap.isReady()) return;
            if (!this.visible || this.opacity === 0) {
                if (this._endFrameSprite) this._endFrameSprite.visible = false;
                return;
            }
            if (!this._endFrameSprite) {
                var w = this.bitmap.width + 16;
                var h = this.bitmap.height + 12;
                var fbmp = new Bitmap(w, h);
                var ctx = fbmp._context;
                // 外发光（径向）
                var grad = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, Math.max(w,h)*0.65);
                grad.addColorStop(0, 'rgba(255,220,140,0.4)');
                grad.addColorStop(1, 'rgba(255,220,140,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                // 双层边框
                ctx.strokeStyle = 'rgba(255,200,120,0.9)';
                ctx.lineWidth = 2;
                roundRect(ctx, 4.5, 4.5, w-9, h-9, 4);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(120,80,40,0.8)';
                ctx.lineWidth = 1;
                roundRect(ctx, 2.5, 2.5, w-5, h-5, 6);
                ctx.stroke();
                if (fbmp._setDirty) fbmp._setDirty();
                this._endFrameSprite = new Sprite(fbmp);
                this._endFrameSprite.anchor.x = this.anchor.x;
                this._endFrameSprite.anchor.y = this.anchor.y;
                this._endFrameSprite.blendMode = PIXI.BLEND_MODES.NORMAL;
                // 放到按钮后面
                if (this.parent) this.parent.addChildAt(this._endFrameSprite, this.parent.getChildIndex(this));
            }
            this._endFrameSprite.visible = true;
            this._endFrameSprite.x = this.x;
            this._endFrameSprite.y = this.y;
            this._endFrameSprite.scale.x = this.scale.x;
            this._endFrameSprite.scale.y = this.scale.y;
            this._endFrameSprite.rotation = this.rotation;
            this._endFrameSprite.opacity = this.opacity;
            // 呼吸
            this._endFrameSprite._phase = (this._endFrameSprite._phase || 0) + 0.06;
            var glow = (Math.sin(this._endFrameSprite._phase) + 1) * 0.5;
            this._endFrameSprite.opacity = Math.min(this.opacity, 180 + glow * 60);
        };
    }

    // ===== 5. 隐藏默认 BattleStatus 窗口 =====
    if (HIDE_STATUS) {
        var _Window_BattleStatus_initialize = Window_BattleStatus.prototype.initialize;
        Window_BattleStatus.prototype.initialize = function() {
            _Window_BattleStatus_initialize.call(this);
            this.visible = false;
            this.opacity = 0;
            this.contentsOpacity = 0;
        };
        Window_BattleStatus.prototype.show = function() {};
        Window_BattleStatus.prototype.refresh = function() {
            if (this.contents) this.contents.clear();
        };
        Window_BattleStatus.prototype.updateTone = function() {};
    }

    // ===== 6. 自定义暗紫状态面板 =====
    function drawStatusRune(ctx, cx, cy, s) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = 'rgba(230,210,255,0.85)';
        ctx.beginPath();
        for (var i = 0; i < 4; i++) {
            var a = i * Math.PI / 2;
            ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
            ctx.lineTo(Math.cos(a + Math.PI/4) * s * 0.32, Math.sin(a + Math.PI/4) * s * 0.32);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,250,220,0.95)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStatusBar(bmp, x, y, w, h, info) {
        var ctx = bmp._context;
        // Label
        bmp.fontSize = 13;
        bmp.textColor = '#d8c8ec';
        bmp.outlineColor = 'rgba(0,0,0,0.85)';
        bmp.outlineWidth = 3;
        bmp.drawText(info.label, x, y + (h - 18) / 2, 24, 18, 'left');
        // Bar geometry
        var barX = x + 28;
        var numW = 78;
        var barW = w - 28 - numW;
        var barH = Math.min(11, h - 6);
        var barY = y + (h - barH) / 2;
        if (barW < 20) return;
        // Bar frame
        ctx.fillStyle = 'rgba(8,4,16,0.88)';
        roundRect(ctx, barX, barY, barW, barH, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(170,150,210,0.55)';
        ctx.lineWidth = 0.8;
        roundRect(ctx, barX + 0.5, barY + 0.5, barW - 1, barH - 1, 2);
        ctx.stroke();
        // Fill
        var ratio = info.max > 0 ? Math.min(1, info.cur / info.max) : 0;
        var fillW = Math.max(0, (barW - 2) * ratio);
        if (fillW > 0) {
            var grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
            grad.addColorStop(0, info.c1);
            grad.addColorStop(1, info.c2);
            ctx.fillStyle = grad;
            roundRect(ctx, barX + 1, barY + 1, fillW, barH - 2, 1.5);
            ctx.fill();
            // Top highlight
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(barX + 1, barY + 1, fillW, Math.max(1, (barH - 2) / 2.5));
        }
        // Number
        bmp.fontSize = 13;
        bmp.textColor = '#f4ead8';
        bmp.drawText(info.cur + ' / ' + info.max, x + w - numW, y + (h - 18) / 2, numW - 4, 18, 'right');
    }

    function drawActorSlot(bmp, actor, x, y, w, h) {
        var ctx = bmp._context;
        var nameW = Math.min(150, Math.max(90, w * 0.18));
        var barsX = x + nameW + 10;
        var barsW = w - nameW - 14;
        // Name
        var nameY = STATUS_CLASS ? y + 4 : y + (h - 22) / 2;
        bmp.textColor = '#ede0f8';
        bmp.outlineColor = 'rgba(60,30,100,0.95)';
        bmp.outlineWidth = 3;
        bmp.fontSize = 17;
        var nm = actor.name() || '英灵';
        bmp.drawText('✦ ' + nm + ' ✦', x, nameY, nameW, 22, 'center');
        // Class label
        if (STATUS_CLASS) {
            bmp.fontSize = 11;
            bmp.textColor = '#b3a0cc';
            bmp.outlineWidth = 0;
            bmp.drawText(STATUS_CLASS, x, y + 26, nameW, 14, 'center');
            bmp.outlineWidth = 3;
            // Thin decorative line under name
            ctx.strokeStyle = 'rgba(180,150,220,0.4)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x + 24, y + 24);
            ctx.lineTo(x + nameW - 24, y + 24);
            ctx.stroke();
        }
        // Bars side-by-side
        var barCount = 3;
        var gap = 10;
        var sbW = (barsW - gap * (barCount - 1)) / barCount;
        var bars = [
            { label: 'HP', cur: actor.hp, max: actor.mhp, c1: '#ff5a78', c2: '#b01840' },
            { label: 'MP', cur: actor.mp, max: actor.mmp, c1: '#6aa8ff', c2: '#1f60c8' },
            { label: 'TP', cur: Math.floor(actor.tp || 0), max: 100, c1: '#ffd268', c2: '#c07018' }
        ];
        for (var i = 0; i < barCount; i++) {
            drawStatusBar(bmp, barsX + i * (sbW + gap), y + 2, sbW, h - 4, bars[i]);
        }
    }

    function createStatusPanelBitmap(actors) {
        var W = Graphics.boxWidth - 24;
        var H = 48;
        var bmp = new Bitmap(W, H);
        var ctx = bmp._context;
        // Main bg gradient
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(30,18,48,0.92)');
        grad.addColorStop(0.5, 'rgba(18,10,32,0.94)');
        grad.addColorStop(1, 'rgba(10,6,20,0.95)');
        ctx.fillStyle = grad;
        roundRect(ctx, 0, 0, W, H, 10);
        ctx.fill();
        // Inner soft glow
        var inGrad = ctx.createLinearGradient(0, 0, 0, H);
        inGrad.addColorStop(0, 'rgba(140,100,200,0.18)');
        inGrad.addColorStop(1, 'rgba(50,30,90,0)');
        ctx.fillStyle = inGrad;
        roundRect(ctx, 2, 2, W - 4, H - 4, 8);
        ctx.fill();
        // Silver border
        ctx.strokeStyle = 'rgba(215,205,240,0.88)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 10);
        ctx.stroke();
        // Inner thin purple line
        ctx.strokeStyle = 'rgba(130,95,180,0.45)';
        ctx.lineWidth = 0.8;
        roundRect(ctx, 3.5, 3.5, W - 7, H - 7, 7);
        ctx.stroke();
        // Corner runes
        drawStatusRune(ctx, 12, H / 2, 5.5);
        drawStatusRune(ctx, W - 12, H / 2, 5.5);
        // Slots
        var slotsL = 26, slotsR = W - 26;
        var n = Math.max(1, actors.length);
        var slotW = (slotsR - slotsL) / n;
        for (var i = 0; i < actors.length; i++) {
            var sx = slotsL + i * slotW;
            drawActorSlot(bmp, actors[i], sx, 4, slotW - 8, H - 8);
            if (i > 0) {
                ctx.strokeStyle = 'rgba(170,140,220,0.4)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(sx, 12);
                ctx.lineTo(sx, H - 12);
                ctx.stroke();
            }
        }
        if (bmp._setDirty) bmp._setDirty();
        return bmp;
    }

    if (CUSTOM_STATUS) {
        var _Scene_Battle_createSS_cs = Scene_Battle.prototype.createSpriteset;
        Scene_Battle.prototype.createSpriteset = function() {
            _Scene_Battle_createSS_cs.call(this);
            this._customStatusPanel = new Sprite();
            this._customStatusPanel.x = 12;
            this._customStatusPanel.y = Graphics.boxHeight - 48 - STATUS_Y_OFFSET;
            this.addChild(this._customStatusPanel);
        };

        var _Scene_Battle_update_cs = Scene_Battle.prototype.update;
        Scene_Battle.prototype.update = function() {
            _Scene_Battle_update_cs.call(this);
            this.updateCustomStatusPanel();
        };

        Scene_Battle.prototype.updateCustomStatusPanel = function() {
            if (!this._customStatusPanel) return;
            var leader = $gameParty.leader();
            if (!leader) return;
            var members = [leader];
            var key = members.map(function(a) {
                return a.actorId() + ':' + a.hp + '/' + a.mhp + ':' + a.mp + '/' + a.mmp + ':' + Math.floor(a.tp || 0);
            }).join('|');
            if (this._customStatusPanel._cachedKey !== key) {
                this._customStatusPanel.bitmap = createStatusPanelBitmap(members);
                this._customStatusPanel._cachedKey = key;
            }
        };
    }

    var _Game_Party_isAllDead = Game_Party.prototype.isAllDead;
    Game_Party.prototype.isAllDead = function() {
        if (this.inBattle() && this.leader()) {
            return this.leader().isDead();
        }
        return _Game_Party_isAllDead.call(this);
    };

    // 强制修正封印/反制类状态的motion，防止编辑器保存后覆盖回1导致角色卡abnormal姿势
    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!_DataManager_isDatabaseLoaded.call(this)) return false;
        if ($dataStates) {
            if ($dataStates[37]) $dataStates[37].motion = 0;  // 封印
            if ($dataStates[49]) $dataStates[49].motion = 0;  // 攻击波（机制反转卡牌）
            if ($dataStates[52]) $dataStates[52].motion = 0;  // 恶龙咆哮（机制反转技能）
        }
        return true;
    };

})();
