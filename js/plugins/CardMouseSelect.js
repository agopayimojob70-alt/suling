/*:
 * @plugindesc 手牌鼠标悬浮选中 + 点击打出 v1.0
 * @author Claude
 *
 * @help
 * 鼠标悬浮手牌卡 → 自动选中（触发并行事件 27 更新视觉）
 * 鼠标点击手牌卡 → 模拟按下 OK 键，触发公共事件 15 使用该卡
 *
 * 兼容：键盘方向键 + OK 依然可用，纯粹做为"补充"输入方式。
 *
 * 依赖：手牌 Picture ID 连续（默认 11 ~ 40），window.handCard 和
 * window.chooseCard 全局变量（项目原有设定）。
 *
 * @param Card Picture Min
 * @text 手牌起始 Picture ID
 * @type number
 * @default 11
 *
 * @param Card Picture Max
 * @text 手牌结束 Picture ID
 * @type number
 * @default 40
 *
 * @param Require Battle
 * @text 仅战斗中生效
 * @desc true = 只在 Scene_Battle 生效；false = 地图上也响应（默认 false，兼容地图上的卡牌系统）
 * @type boolean
 * @default false
 *
 * @param Debug Log
 * @text 调试日志
 * @desc 开启后控制台会输出 hover/click 信息
 * @type boolean
 * @default false
 */

(function() {
    var P = PluginManager.parameters('CardMouseSelect');
    var PIC_MIN = Number(P['Card Picture Min'] || 11);
    var PIC_MAX = Number(P['Card Picture Max'] || 40);
    var BATTLE_ONLY = (P['Require Battle'] || 'false') === 'true';
    var DEBUG = (P['Debug Log'] || 'false') === 'true';

    // 用 Input.isTriggered('ok') 做接线口：一旦鼠标点中卡，
    // 下一次 ok 检查返回 true（仅一次），事件 16 自然走原逻辑
    var _inputIsTriggered = Input.isTriggered;
    Input.isTriggered = function(name) {
        if (name === 'ok' && Input._cardMouseTrigger) {
            Input._cardMouseTrigger = false;
            return true;
        }
        return _inputIsTriggered.call(this, name);
    };

    // 递归找指定 pictureId 的 sprite
    function findPictureSprite(node, id) {
        if (!node) return null;
        if (node._pictureId === id) return node;
        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                var r = findPictureSprite(node.children[i], id);
                if (r) return r;
            }
        }
        return null;
    }

    function isMouseOver(sprite) {
        if (!sprite || !sprite.visible || !sprite.bitmap) return false;
        if (!sprite.bitmap.isReady || !sprite.bitmap.isReady()) return false;
        if (sprite.opacity === 0) return false;
        var gx = TouchInput.x, gy = TouchInput.y;
        var sx = Math.abs(sprite.scale.x || 1);
        var sy = Math.abs(sprite.scale.y || 1);
        var w = sprite.bitmap.width * sx;
        var h = sprite.bitmap.height * sy;
        var ax = (sprite.anchor && sprite.anchor.x) || 0;
        var ay = (sprite.anchor && sprite.anchor.y) || 0;
        var x = sprite.x - w * ax;
        var y = sprite.y - h * ay;
        return gx >= x && gx <= x + w && gy >= y && gy <= y + h;
    }

    function updateCardHover() {
        if (typeof window.handCard === 'undefined' || !window.handCard) return;
        if (window.handCard.length === 0) return;
        if (typeof window.chooseCard === 'undefined') return;

        var scene = SceneManager._scene;
        if (!scene || !scene._spriteset) return;

        var hoveredIdx = -1;
        // 逆序：从右到左找，靠后的卡（层级上在上方）优先命中
        for (var i = window.handCard.length - 1; i >= 0; i--) {
            var sprite = findPictureSprite(scene._spriteset, PIC_MIN + i);
            if (isMouseOver(sprite)) {
                hoveredIdx = i;
                break;
            }
        }

        if (hoveredIdx >= 0) {
            if (window.chooseCard !== hoveredIdx) {
                window.chooseCard = hoveredIdx;
                if (DEBUG) console.log('[CardMouseSelect] hover card idx=', hoveredIdx);
            }
            if (TouchInput.isTriggered()) {
                Input._cardMouseTrigger = true;
                if (DEBUG) console.log('[CardMouseSelect] click -> simulate OK');
            }
        }
    }

    var _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        updateCardHover();
    };

    if (!BATTLE_ONLY) {
        var _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _Scene_Map_update.call(this);
            updateCardHover();
        };
    }
})();
