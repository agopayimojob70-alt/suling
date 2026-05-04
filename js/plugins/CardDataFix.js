/*:
 * @plugindesc 卡牌数据运行时补丁 v1.0（Display 图、描述文字）
 * @author Claude
 *
 * @help
 * 游戏启动时自动修正指定卡牌的 Display 元标签和 description。
 * 不管 Items.json 被编辑器覆盖成什么样，插件都会在 DataManager 加载后
 * 把卡牌数据改回期望值。用于长期维护卡牌配置，不怕编辑器误保存。
 *
 * 所有修正都走 DataManager.extractMetadata 重新解析 meta，
 * 保证 handCard[chooseCard].description 等显示逻辑生效。
 *
 * 要增减卡牌映射：修改下面的 DISPLAY_MAP / DESC_MAP。
 */

(function() {

    // 卡牌 id → Display 图片文件名
    var DISPLAY_MAP = {
        35: '封刃',       // 专属新图
        36: '封御',
        37: '封印',
        38: '吞噬',
        39: '狂暴',
        40: '冰雪刺',
        41: '碎星闪',
        42: '灵光斩',
        43: '攻击波',
        44: '炎光斩',
        45: '荧光护盾',
        46: '恶龙咆哮'
    };

    // 卡牌 id → 描述文字
    var DESC_MAP = {
        40: '造成 110% 攻击力的冰霜伤害\n附加冰封效果',
        41: '造成 118% 攻击力的穿透伤害\n附加碎星效果',
        42: '造成 100% 攻击力的光系斩击\n附加灵光效果',
        43: '造成 102% 攻击力的冲击波伤害\n附加震荡效果',
        44: '无视防御，造成 100% 攻击力火焰伤害\n附加灼烧效果',
        45: '为自己添加最大生命 13% 的护盾\n附加荧光防护',
        46: '强力终极打击\n消耗 2 费，威力巨大'
    };

    function patchItem(item, displayName, description) {
        if (!item) return;
        // 补/改 Display 标签
        if (displayName) {
            if (/<Display:[^>]*>/.test(item.note)) {
                if (item.meta.Display !== displayName) {
                    item.note = item.note.replace(/<Display:[^>]*>/, '<Display:' + displayName + '>');
                }
            } else {
                item.note = '<Display:' + displayName + '>\n' + (item.note || '');
            }
        }
        // 补/改描述
        if (description !== undefined) {
            item.description = description;
        }
        // 重算 meta
        DataManager.extractMetadata(item);
    }

    function applyCardFixes() {
        if (!$dataItems) return;
        Object.keys(DISPLAY_MAP).forEach(function(id) {
            var iid = Number(id);
            patchItem($dataItems[iid], DISPLAY_MAP[id], DESC_MAP[id]);
        });
    }

    // Hook DataManager.onLoad：$dataItems 加载完成后立刻打补丁
    var _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _DataManager_onLoad.call(this, object);
        if (object === $dataItems) {
            applyCardFixes();
        }
    };

    // 老存档兼容：读档完也修一次
    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        applyCardFixes();
    };
})();
