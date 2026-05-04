/*:
 * @plugindesc 镜头缩放插件 v3.1 - 修复屏幕震动兼容
 * @author R01
 *
 * @param defaultZoomSwitch
 * @text 默认缩放开关
 * @desc 指定一个开关ID，开启后进入地图自动应用默认缩放。设为0禁用。
 * @type switch
 * @default 0
 *
 * @param defaultZoomScale
 * @text 默认缩放倍率
 * @desc 当默认缩放开关开启时使用的缩放值（例如1.5）
 * @type number
 * @default 1.5
 *
 * @param smoothFactor
 * @text 平滑系数
 * @desc 缩放变化的平滑速度，0~1之间，值越小越慢（默认0.15）
 * @type number
 * @min 0.01
 * @max 1.0
 * @default 0.15
 *
 * @help
 * ============================================================================
 * 插件命令
 * ============================================================================
 *   Zoom [数值]    - 设置镜头缩放倍率，例如 Zoom 2.0
 *   ZoomOff        - 关闭缩放，恢复1.0倍率
 *
 * ============================================================================
 * 功能说明
 * ============================================================================
 * 1. 平滑缩放：缩放倍率变化时带有缓动效果。
 * 2. 默认缩放：可设置开关，进入地图自动缩放至指定倍率。
 * 3. 战斗保存：进入战斗前保存当前缩放，战斗结束后自动恢复。
 * 4. 屏幕震动：已修复与缩放插件的兼容问题。
 */

(function() {
    'use strict';

    //=========================================================================
    // 参数解析
    //=========================================================================
    const params = PluginManager.parameters('R0_CameraZoom');
    const DEFAULT_ZOOM_SWITCH = Number(params['defaultZoomSwitch'] || 0);
    const DEFAULT_ZOOM_SCALE = Number(params['defaultZoomScale'] || 1.5);
    const SMOOTH_FACTOR = Number(params['smoothFactor'] || 0.15);

    //=========================================================================
    // 全局缩放状态（用于战斗恢复、存档等）
    //=========================================================================
    const ZoomState = {
        target: 1.0,      // 目标缩放倍率
        current: 1.0,     // 当前显示倍率
        saved: null,      // 进入战斗前保存的目标倍率
    };

    //=========================================================================
    // Game_Screen 扩展
    //=========================================================================
    // 初始化缩放属性
    const _Game_Screen_clear = Game_Screen.prototype.clear;
    Game_Screen.prototype.clear = function() {
        _Game_Screen_clear.call(this);
        this._zoomTarget = 1.0;
        this._zoomCurrent = 1.0;
    };

    // 设置目标缩放
    Game_Screen.prototype.setZoom = function(scale) {
        this._zoomTarget = Math.max(1.0, Number(scale) || 1.0);
        ZoomState.target = this._zoomTarget;
    };

    // 获取当前缩放
    Game_Screen.prototype.getZoom = function() {
        return this._zoomCurrent || 1.0;
    };

    // 平滑更新
    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.call(this);
        if (!SceneManager._scene || !(SceneManager._scene instanceof Scene_Map)) return;

        const target = this._zoomTarget;
        this._zoomCurrent += (target - this._zoomCurrent) * SMOOTH_FACTOR;
        if (Math.abs(this._zoomCurrent - target) < 0.001) {
            this._zoomCurrent = target;
        }
        ZoomState.current = this._zoomCurrent;
    };

    //=========================================================================
    // 保存原始震动偏移量
    //=========================================================================
    const _Spriteset_Map_initialize = Spriteset_Map.prototype.initialize;
    Spriteset_Map.prototype.initialize = function() {
        _Spriteset_Map_initialize.call(this);
        this._zoomBaseX = 0;
        this._zoomBaseY = 0;
    };

    //=========================================================================
    // Spriteset_Map 缩放变换（修复震动兼容）
    //=========================================================================
    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        // 先调用原始更新，让震动效果计算好 this.x 和 this.y
        _Spriteset_Map_update.call(this);
        
        // 保存震动产生的偏移量
        const shakeX = this.x;
        const shakeY = this.y;
        
        // 应用缩放变换
        this.applyZoomTransform();
        
        // 将震动偏移叠加回缩放后的位置
        this.x += shakeX;
        this.y += shakeY;
    };

    Spriteset_Map.prototype.applyZoomTransform = function() {
        const scale = $gameScreen.getZoom();
        this.scale.x = scale;
        this.scale.y = scale;

        if (scale > 1.0) {
            const cx = Graphics.width / 2;
            const cy = Graphics.height / 2;
            const px = $gamePlayer.screenX();
            const py = $gamePlayer.screenY() - 24;
            this._zoomBaseX = cx - px * scale;
            this._zoomBaseY = cy - py * scale;
        } else {
            this._zoomBaseX = 0;
            this._zoomBaseY = 0;
        }

        // 先应用缩放基础偏移
        this.x = this._zoomBaseX;
        this.y = this._zoomBaseY;

        // 让图片层保持屏幕坐标，不受地图缩放/偏移影响
        if (this._pictureContainer) {
            this._pictureContainer.scale.x = 1 / scale;
            this._pictureContainer.scale.y = 1 / scale;
            this._pictureContainer.x = -this.x / scale;
            this._pictureContainer.y = -this.y / scale;
        }
    };

    //=========================================================================
    // 点击坐标修正（缩放后保证点击地图位置准确）
    //=========================================================================
    const _Game_Map_canvasToMapX = Game_Map.prototype.canvasToMapX;
    Game_Map.prototype.canvasToMapX = function(x) {
        const scale = $gameScreen.getZoom();
        if (scale > 1.0) {
            const tw = this.tileWidth();
            const cx = Graphics.width / 2;
            const rx = $gamePlayer._realX;
            return Math.floor((x - cx) / (tw * scale) + rx);
        }
        return _Game_Map_canvasToMapX.call(this, x);
    };

    const _Game_Map_canvasToMapY = Game_Map.prototype.canvasToMapY;
    Game_Map.prototype.canvasToMapY = function(y) {
        const scale = $gameScreen.getZoom();
        if (scale > 1.0) {
            const th = this.tileHeight();
            const cy = Graphics.height / 2;
            const ry = $gamePlayer._realY;
            return Math.floor((y - cy + 24) / (th * scale) + ry);
        }
        return _Game_Map_canvasToMapY.call(this, y);
    };

    //=========================================================================
    // 地图场景启动时应用默认缩放
    //=========================================================================
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (DEFAULT_ZOOM_SWITCH > 0 && $gameSwitches.value(DEFAULT_ZOOM_SWITCH)) {
            $gameScreen.setZoom(DEFAULT_ZOOM_SCALE);
            $gameScreen._zoomCurrent = DEFAULT_ZOOM_SCALE;
        }
        if (ZoomState.target !== $gameScreen._zoomTarget) {
            $gameScreen.setZoom(ZoomState.target);
        }
    };

    //=========================================================================
    // 战斗保存/恢复缩放
    //=========================================================================
    const _Scene_Battle_start = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function() {
        if ($gameScreen) {
            ZoomState.saved = $gameScreen._zoomTarget;
        }
        _Scene_Battle_start.call(this);
    };

    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        if (ZoomState.saved !== null) {
            $gameScreen.setZoom(ZoomState.saved);
            $gameScreen._zoomCurrent = ZoomState.saved;
            ZoomState.target = ZoomState.saved;
            ZoomState.saved = null;
        }
        _Scene_Battle_terminate.call(this);
    };

    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function(result) {
        if (ZoomState.saved !== null) {
            $gameScreen.setZoom(ZoomState.saved);
            $gameScreen._zoomCurrent = ZoomState.saved;
            ZoomState.target = ZoomState.saved;
            ZoomState.saved = null;
        }
        _BattleManager_endBattle.call(this, result);
    };

    //=========================================================================
    // 存档与读档
    //=========================================================================
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.zoomTarget = ZoomState.target;
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (contents.zoomTarget !== undefined) {
            ZoomState.target = contents.zoomTarget;
            if ($gameScreen) {
                $gameScreen.setZoom(contents.zoomTarget);
                $gameScreen._zoomCurrent = contents.zoomTarget;
            }
        }
    };

    //=========================================================================
    // 插件命令
    //=========================================================================
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'Zoom') {
            const scale = parseFloat(args[0]);
            if (!isNaN(scale)) $gameScreen.setZoom(scale);
        } else if (command === 'ZoomOff') {
            $gameScreen.setZoom(1.0);
        }
    };

})();

// *可能导致其他插件冲突。
Scene_Map.prototype.launchBattle = function() {
    BattleManager.saveBgmAndBgs();
    this.stopAudioOnBattleStart();
    SoundManager.playBattleStart();
    this.startFadeOut(this.fadeSpeed())
    this._mapNameWindow.hide();
};


//玩家受击添加物品
var _BattleManager_endTurn = BattleManager.endTurn;
BattleManager.endTurn = function() {
    _BattleManager_endTurn.call(this);
    if (!$gameSwitches.value(22)) {
        console.log("【hp检测触发】");
        checkActor1LowHealth();
    }
    
};

function checkActor1LowHealth() {
    // 检查是否已触发过
    // if ($gameSwitches.value(22)) return false;
    
    var actor = $gameActors.actor(1);
    if (!actor || actor.isDead()) return false;
    var threshold = Math.floor(actor.mhp * 50 / 100);
    
    if (actor.hp >= threshold) return false;
    $gameTemp.reserveCommonEvent(58);
    
    return true;
}


Game_Temp.prototype.playAnim = function(actor, id) {
    if(actor === "A"){
        $gameTroop.members()[0].startAnimation(id);
    }
    else if(actor === "E"){
        $gameActors.actor(1).startAnimation(id);
    }
    
}