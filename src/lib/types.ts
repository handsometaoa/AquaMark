/** 单条水印规则：一个域名一套配置 */
export interface WatermarkRule {
  id: string;
  /** 域名，如 example.com；自动匹配其所有子域名 */
  domain: string;
  enabled: boolean;
  /** 水印文本 */
  text: string;
  /** 颜色，#RRGGBB */
  color: string;
  /** 深浅 1~100（映射为 0.005~0.5 的透明度） */
  opacity: number;
  /** 密度 1~10（越大水印越密） */
  density: number;
  /** 旋转角度 -90~90 */
  rotation: number;
  /** 字号 px */
  fontSize: number;
  createdAt: number;
}

export interface Settings {
  /** 总开关：暂停/恢复所有水印 */
  masterEnabled: boolean;
  rules: WatermarkRule[];
  /** 规则最后变动时间（用于判断是否存在未备份的改动） */
  updatedAt?: number;
  /** 上次导出备份时间 */
  lastExportAt?: number;
}

export const DEFAULT_TEXT = '内部资料 · 禁止外传';
export const DEFAULT_COLOR = '#FF375F';
