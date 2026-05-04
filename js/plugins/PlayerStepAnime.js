/*:
 * @plugindesc 玩家待机动画 v2.0（踏步 / 呼吸浮动 / 偶尔转头）
 * @author Claude
 *
 * @help
 * 提供三种可组合的待机行为，在插件参数里独立开关：
 *
 *   Enable Step Anime    = 原地踏步（行走图 3 帧循环）
 *   Enable Breathing     = 呼吸浮动（Y 轴极微小正弦上下动）
 *   Enable Head Turn     = 偶尔转头观察（发呆时随机看一下别的方向）
 *
 * 默认开启"呼吸 + 转头"，关闭"踏步"。
 *
 * @param Enable Step Anime
 * @text 踏步动画
 * @desc 站立时循环行走图 3 帧
 * @type boolean
 * @default false
 *
 * @param Enable Breathing
 * @text 呼吸浮动
 * @desc 角色静止时上下微小浮动
 * @type boolean
 * @default true
 *
 * @param Breathing Amplitude
 * @text 呼吸幅度（像素）
 * @desc 上下浮动的最大像素（建议 1-2）
 * @type number
 * @default 1
 *
 * @param Breathing Speed
 * @text 呼吸速度
 * @desc 数值越大呼吸越快（建议 0.02-0.08）
 * @default 0.04
 *
 * @param Enable Head Turn
 * @text 偶尔转头
 * @desc 长时间不动时随机转一下方向再转回来
 * @type boolean
 * @default true
 *
 * @param Turn Interval Min
 * @text 转头最小间隔（帧）
 * @desc 距上次转头至少多少帧后才可能再转（60=1秒）
 * @type number
 * @default 360
 *
 * @param Turn Interval Max
 * @text 转头最大间隔（帧）
 * @desc 距上次转头最多多少帧必转
 * @type number
 * @default 720
 *
 * @param Turn Hold Frames
 * @text 转头保持帧数
 * @desc 转过去之后看多少帧才转回来（60=1秒）
 * @type number
 * @default 45
 *
 * @param Follower Also Step
 * @text 跟随者也踏步
 * @desc 踏步动画是否同步给跟随者
 * @type boolean
 * @default true
 *
 * @param Idle Step Wait
 * @text 待机踏步每帧保持
 * @desc 站着踏步时每帧保持多少帧后再换（越大越慢，默认 30）
 * @type number
 * @default 30
 *
 * @param Sideways Freeze
 * @text 侧面站立不踏步
 * @desc 朝左/右时不踏步（侧面行走图晃头明显时建议开启）
 * @type boolean
 * @default true
 */

(function() {
    var P = PluginManager.parameters('PlayerStepAnime');
    var EN_STEP = (P['Enable Step Anime'] || 'false') === 'true';
    var EN_BREATH = (P['Enable Breathing'] || 'true') === 'true';
    var EN_TURN = (P['Enable Head Turn'] || 'true') === 'true';
    var BREATH_AMP = Number(P['Breathing Amplitude'] || 1);
    var BREATH_SPEED = Number(P['Breathing Speed'] || 0.04);
    var TURN_MIN = Number(P['Turn Interval Min'] || 360);
    var TURN_MAX = Number(P['Turn Interval Max'] || 720);
    var TURN_HOLD = Number(P['Turn Hold Frames'] || 45);
    var FOLLOWER_STEP = (P['Follower Also Step'] || 'true') === 'true';
    var IDLE_WAIT = Number(P['Idle Step Wait'] || 30);
    var SIDE_FREEZE = (P['Sideways Freeze'] || 'true') === 'true';

    // ==== 踏步动画 ====
    if (EN_STEP) {
        // 判断"真正停下来"：不在格子间过渡，且停了至少若干帧
        function trulyIdle(ch) {
            return !ch.isMoving() && ch._stopCount > 3;
        }

        // 待机踏步减速
        var _animationWait = Game_Player.prototype.animationWait;
        Game_Player.prototype.animationWait = function() {
            if (trulyIdle(this)) return IDLE_WAIT;
            return _animationWait.call(this);
        };
        var _folWait = Game_Follower.prototype.animationWait;
        Game_Follower.prototype.animationWait = function() {
            if (trulyIdle(this)) return IDLE_WAIT;
            return _folWait.call(this);
        };

        // 侧面不踏步：朝左(4)右(6)且真正静止时才冻结
        if (SIDE_FREEZE) {
            var _updatePattern = Game_Player.prototype.updatePattern;
            Game_Player.prototype.updatePattern = function() {
                if (trulyIdle(this) && (this.direction() === 4 || this.direction() === 6)) {
                    this.resetPattern();
                    return;
                }
                _updatePattern.call(this);
            };
            var _folUpdatePattern = Game_Follower.prototype.updatePattern;
            Game_Follower.prototype.updatePattern = function() {
                if (trulyIdle(this) && (this.direction() === 4 || this.direction() === 6)) {
                    this.resetPattern();
                    return;
                }
                _folUpdatePattern.call(this);
            };
        }
        var _Game_Player_initMembers = Game_Player.prototype.initMembers;
        Game_Player.prototype.initMembers = function() {
            _Game_Player_initMembers.call(this);
            this._stepAnime = true;
        };
        var _Game_Follower_initialize = Game_Follower.prototype.initialize;
        Game_Follower.prototype.initialize = function(memberIndex) {
            _Game_Follower_initialize.call(this, memberIndex);
            if (FOLLOWER_STEP) this._stepAnime = true;
        };
        var _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function() {
            _Scene_Map_onMapLoaded.call(this);
            if ($gamePlayer) {
                $gamePlayer.setStepAnime(true);
                if (FOLLOWER_STEP && $gamePlayer.followers) {
                    $gamePlayer.followers().forEach(function(f){ f.setStepAnime(true); });
                }
            }
        };
    }

    // ==== 呼吸浮动 ====
    if (EN_BREATH) {
        var _Sprite_Character_updatePosition = Sprite_Character.prototype.updatePosition;
        Sprite_Character.prototype.updatePosition = function() {
            _Sprite_Character_updatePosition.call(this);
            if (!(this._character instanceof Game_Player)) return;
            this._breathPhase = (this._breathPhase || 0) + BREATH_SPEED;
            if (!this._character.isMoving()) {
                this.y += Math.sin(this._breathPhase) * BREATH_AMP;
            }
        };
    }

    // ==== 偶尔转头 ====
    if (EN_TURN) {
        var _Game_Player_update = Game_Player.prototype.update;
        Game_Player.prototype.update = function(sceneActive) {
            _Game_Player_update.call(this, sceneActive);
            if (sceneActive) this.updateIdleHeadTurn();
        };

        Game_Player.prototype.updateIdleHeadTurn = function() {
            // 忙时重置
            if (this.isMoving() || $gameMap.isEventRunning() || $gameMessage.isBusy() || $gameMap.isScrolling()) {
                if (this._turnState === 'looking' && this._turnOriginalDir) {
                    this.setDirection(this._turnOriginalDir);
                }
                this._turnState = 'idle';
                this._turnTimer = 0;
                this._nextTurnAt = TURN_MIN + Math.floor(Math.random() * (TURN_MAX - TURN_MIN));
                this._turnOriginalDir = null;
                return;
            }
            this._turnTimer = (this._turnTimer || 0) + 1;
            if (this._nextTurnAt === undefined) {
                this._nextTurnAt = TURN_MIN + Math.floor(Math.random() * (TURN_MAX - TURN_MIN));
            }

            if (this._turnState === 'looking') {
                if (this._turnTimer >= TURN_HOLD) {
                    this.setDirection(this._turnOriginalDir);
                    this._turnOriginalDir = null;
                    this._turnState = 'idle';
                    this._turnTimer = 0;
                    this._nextTurnAt = TURN_MIN + Math.floor(Math.random() * (TURN_MAX - TURN_MIN));
                }
            } else {
                if (this._turnTimer >= this._nextTurnAt) {
                    var original = this.direction();
                    this._turnOriginalDir = original;
                    var dirs = [2, 4, 6, 8].filter(function(d){ return d !== original; });
                    var newDir = dirs[Math.floor(Math.random() * dirs.length)];
                    this.setDirection(newDir);
                    this._turnState = 'looking';
                    this._turnTimer = 0;
                }
            }
        };
    }
})();
