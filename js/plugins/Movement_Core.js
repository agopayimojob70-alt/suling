/*:
 * @plugindesc [v5.0] 终极移动核心 (WASD + 8方向 + 鼠标双键行走 + 智能左键交互)
 * @author Gemini
 * @help
 * 1. 映射 WASD。
 * 2. 键盘支持 8 方向行走。
 * 3. 鼠标左键：点空地行走，点事件(NPC)直接触发交互。
 * 4. 鼠标右键：点击空地行走。
 * 5. 修复了 Yami 插件遗留的速度异常问题。
 */

(function() {
    
    // --- 1. WASD 按键映射 ---
    Input.keyMapper[65] = 'left';
    Input.keyMapper[83] = 'down';
    Input.keyMapper[68] = 'right';
    Input.keyMapper[87] = 'up';

    // --- 2. 鼠标逻辑接管 (双键行走 + 智能交互) ---

    // 独立解析 <click_activate>，不依赖 DK_Mouse_System
    Game_Event.prototype.hasClickActivate = function() {
        if (this.mouseSettings && this.mouseSettings.clickActivate) return true;
        var page = this.page();
        var list = page ? page.list : null;
        if (!list) return false;
        for (var i = 0; i < list.length; i++) {
            var cmd = list[i];
            if ((cmd.code === 108 || cmd.code === 408) && cmd.parameters[0].match(/<click_activate>/i)) {
                return true;
            }
        }
        return false;
    };

    var _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (TouchInput.isTriggered()) {
            var x = $gameMap.canvasToMapX(TouchInput.x);
            var y = $gameMap.canvasToMapY(TouchInput.y);

            var events = $gameMap.eventsXy(x, y);
            var targetEvent = events[0];

            // 优先检查 click_activate 事件，直接触发不走路
            var clickEvent = events.find(function(event) {
                return !event._erased && event.hasClickActivate();
            });
            if (clickEvent) {
                clickEvent.start();
                $gameTemp.clearDestination();
                return;
            }

            if (TouchInput.isCancelled()) {
                // 【右键】 强制执行行走
                $gameTemp.setDestination(x, y);
            } else {
                // 【左键】
                if (targetEvent && targetEvent.isTriggerIn([0, 1, 2])) {
                    // 如果点到的是 NPC，先走过去并触发交互 (模拟 Enter)
                    $gameTemp.setDestination(x, y);
                    Input._currentState['ok'] = true;
                    setTimeout(() => { Input._currentState['ok'] = false; }, 10);
                } else {
                    // 如果点的是空地，执行正常行走
                    $gameTemp.setDestination(x, y);
                }
            }
        }
    };

    // 禁用右键自动菜单，菜单改用 Esc 或 X 键
    Scene_Map.prototype.isMenuCalled = function() {
        return Input.isTriggered('menu'); 
    };

    // --- 3. 八方向键盘逻辑 ---

    var _Game_Player_getInputDirection = Game_Player.prototype.getInputDirection;
    Game_Player.prototype.getInputDirection = function() {
        return Input.dir8 || _Game_Player_getInputDirection.call(this);
    };

    Game_Player.prototype.executeMove = function(direction) {
        if ([1, 3, 7, 9].contains(direction)) {
            var horz = (direction === 1 || direction === 7) ? 4 : 6;
            var vert = (direction === 1 || direction === 3) ? 2 : 8;
            this.moveDiagonally(horz, vert);
        } else {
            this.moveStraight(direction);
        }
    };

    var _Game_Player_moveByInput = Game_Player.prototype.moveByInput;
    Game_Player.prototype.moveByInput = function() {
        if (!this.isMoving() && this.canMove()) {
            var direction = this.getInputDirection();
            if (direction > 0) {
                $gameTemp.clearDestination();
                this.executeMove(direction);
                return;
            }
        }
        _Game_Player_moveByInput.call(this);
    };

    // --- 4. 彻底修复鼠标点击后的极速移动问题 ---

    // 强制修正寻路距离算法
    Game_Map.prototype.diagonalDistance = function(x1, y1, x2, y2) {
        var x = Math.abs(this.deltaX(x1, x2));
        var y = Math.abs(this.deltaY(y1, y2));
        return Math.max(x, y); 
    };

    // 每帧校验：只要是鼠标寻路模式，速度强制锁定为 4
    var _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        _Game_Player_update.call(this, sceneActive);
        if ($gameTemp.isDestinationValid() && this.isMoving()) {
            if (this._moveSpeed > 4) this.setMoveSpeed(4);
        }
    };

    // 修复穿墙判定
    Game_CharacterBase.prototype.canPassDiagonally = function(x, y, horz, vert) {
        var x2 = $gameMap.roundXWithDirection(x, horz);
        var y2 = $gameMap.roundYWithDirection(y, vert);
        return this.canPass(x, y, vert) && this.canPass(x, y2, horz) &&
               this.canPass(x, y, horz) && this.canPass(x2, y, vert);
    };

})();