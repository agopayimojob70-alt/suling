//=============================================================================
// SPD.js - 拾取物品显示插件（屏幕左下角固定版，带窗口背景）
//=============================================================================
/*:
 * @plugindesc 在地图左下角显示物品栏，点击图标查看说明。
 * @author 修复版
 *
 * @param MaxDisplayItems
 * @text 最大显示数量
 * @desc 最多同时显示多少个物品图标
 * @type number
 * @default 10
 *
 * @param HideSwitchId
 * @text 隐藏开关ID
 * @desc 当指定ID的开关为ON时，隐藏物品栏
 * @type number
 * @default 10
 *
 * @help
 * 插件命令：无
 * 功能：自动收集队伍中所有物品，以图标形式显示在屏幕左下角。
 * 点击图标可查看物品名称和描述。
 * 窗口带有默认的游戏窗口背景框。
 */

(function() {
    'use strict';

    var parameters = PluginManager.parameters('SPD');
    var MAX_DISPLAY = Number(parameters['MaxDisplayItems'] || 10);
    var HIDE_SWITCH_ID = Number(parameters['HideSwitchId'] || 10);

    var _displayItems = [];

    //=========================================================================
    // 更新物品列表（按数据库顺序，取最后 MAX_DISPLAY 个）
    //=========================================================================
    function updateDisplayList() {
        var items = [];
        for (var i = 1; i < $dataItems.length; i++) {
            var item = $dataItems[i];
            if (item && $gameParty.numItems(item) > 0) {
                items.push(item);
            }
        }
        _displayItems = items.slice(-MAX_DISPLAY);
    }

    //=========================================================================
    // 自定义窗口
    //=========================================================================
    function Window_PickupDisplay() {
        this.initialize.apply(this, arguments);
    }

    Window_PickupDisplay.prototype = Object.create(Window_Base.prototype);
    Window_PickupDisplay.prototype.constructor = Window_PickupDisplay;

    Window_PickupDisplay.prototype.initialize = function() {
        var width = Graphics.boxWidth;
        var height = 80;
        // 固定在屏幕左下角
        var x = 0;
        var y = Graphics.boxHeight - height;
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.opacity = 255;            // 显示窗口背景
        this._lastItemCount = 0;
        this.createContents();
        this.refresh();
    };

    Window_PickupDisplay.prototype.update = function() {
        Window_Base.prototype.update.call(this);

        // 根据开关和消息状态控制可见性
        var shouldHide = $gameSwitches.value(HIDE_SWITCH_ID) || $gameMessage.isBusy();
        this.visible = !shouldHide;

        // 检查队伍物品总数是否变化
        var currentCount = $gameParty.allItems().reduce(function(sum, item) {
            return sum + $gameParty.numItems(item);
        }, 0);
        if (this._lastItemCount !== currentCount) {
            this._lastItemCount = currentCount;
            this.refresh();
        }

        // 点击检测
        if (TouchInput.isTriggered() && this.visible) {
            this.processTouch();
        }
    };

    Window_PickupDisplay.prototype.processTouch = function() {
        var tx = TouchInput.x;
        var ty = TouchInput.y;
        // 检查是否点击在图标区域（y 方向 12~60）
        if (ty >= this.y + 12 && ty <= this.y + 60) {
            var relX = tx - this.x - 12;
            var index = Math.floor(relX / 48);
            if (index >= 0 && index < _displayItems.length) {
                var item = _displayItems[index];
                SoundManager.playOk();
                $gameMessage.add("\\C[2][" + item.name + "]\\C[0]\n" + item.description);
            }
        }
    };

    Window_PickupDisplay.prototype.refresh = function() {
        updateDisplayList();
        this.contents.clear();
        for (var i = 0; i < _displayItems.length; i++) {
            var item = _displayItems[i];
            var x = 12 + i * 48;
            var count = $gameParty.numItems(item);
            this.drawIcon(item.iconIndex, x, 14);
            this.contents.fontSize = 16;
            this.drawText('×' + count, x, 0, 32, 'center');
            this.resetFontSettings();
        }
    };

    //=========================================================================
    // 将窗口添加到地图场景
    //=========================================================================
    var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._pickupWindow = new Window_PickupDisplay();
        this.addChild(this._pickupWindow);
    };

})();