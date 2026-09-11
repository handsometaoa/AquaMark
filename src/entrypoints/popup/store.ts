import { normalizeSettings } from '../../lib/rules';
import type { WatermarkRule } from '../../lib/types';

/** 弹窗全局共享状态（各渲染/交互模块共同读写） */
export const state = {
  settings: normalizeSettings(null),
  /** 当前激活标签页的域名（非扩展环境为演示域名） */
  currentHost: '',
  /** 正在编辑的规则；null 表示抽屉关闭 */
  editing: null as WatermarkRule | null,
  editingNew: false,
};
