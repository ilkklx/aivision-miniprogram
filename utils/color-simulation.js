/**
 * color-simulation.js
 * 提供色盲视觉模拟算法及色彩对比度计算
 */

/**
 * 将十六进制颜色转换为 RGB 数组
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/**
 * 将 RGB 数组转换为十六进制颜色
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const h = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 计算颜色的相对亮度 (Luminance)
 * 参考 WCAG 2.1 标准
 */
function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * 计算两个颜色之间的对比度
 */
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * 色盲视觉模拟算法 (基于矩阵变换)
 * 类型: protanopia (红色盲), deuteranopia (绿色盲), tritanopia (蓝色盲), achromatopsia (全色盲)
 */
function simulateColorblind(hex, type) {
  const [r, g, b] = hexToRgb(hex);
  let nr, ng, nb;

  switch (type) {
    case 'protanopia': // 红色盲
      nr = r * 0.56667 + g * 0.43333 + b * 0;
      ng = r * 0.55833 + g * 0.44167 + b * 0;
      nb = r * 0 + g * 0.24167 + b * 0.75833;
      break;
    case 'deuteranopia': // 绿色盲
      nr = r * 0.625 + g * 0.375 + b * 0;
      ng = r * 0.7 + g * 0.3 + b * 0;
      nb = r * 0 + g * 0.3 + b * 0.7;
      break;
    case 'tritanopia': // 蓝色盲
      nr = r * 0.95 + g * 0.05 + b * 0;
      ng = r * 0 + g * 0.43333 + b * 0.56667;
      nb = r * 0 + g * 0.475 + b * 0.525;
      break;
    case 'achromatopsia': // 全色盲 (灰度)
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      nr = ng = nb = gray;
      break;
    default:
      return hex;
  }

  return rgbToHex(nr, ng, nb);
}

module.exports = {
  getContrastRatio,
  simulateColorblind,
  hexToRgb,
  rgbToHex
};
