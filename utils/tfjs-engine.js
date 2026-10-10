// utils/tfjs-engine.js

let tf;
let handpose;
let fetchWechat;
let model;

/**
 * 初始化并加载 TFJS 和 Handpose 模型
 * (改用纯 NPM 方案，移除对微信 tfjsPlugin 插件的依赖，解决 80082 权限错误)
 */
async function initEngine() {
  if (model) return model;

  try {
    // 直接引入 npm 包
    tf = require('@tensorflow/tfjs-core');
    require('@tensorflow/tfjs-backend-webgl');
    handpose = require('@tensorflow-models/handpose');
    fetchWechat = require('fetch-wechat');
    
    // 使用 npm 版本的微信适配器，替代 requirePlugin('tfjsPlugin')
    const tfjsWechat = require('@tensorflow/tfjs-wechat');

    // 初始化微信平台适配
    tfjsWechat.setupWechatPlatform({
      fetchFunc: fetchWechat.fetchFunc(),
      tf,
      canvas: wx.createOffscreenCanvas({ type: 'webgl' }) // 匹配 WebGL 后端
    });

    await tf.setBackend('wechat-webgl');
    console.log('[TFJS] Pure NPM Backend initialized:', tf.getBackend());

    // 加载轻量级手势模型
    model = await handpose.load({
      maxContinuousChecks: 1, // 降低连续检查次数以提升性能
      detectionConfidence: 0.6,
      iouThreshold: 0.3,
      scoreThreshold: 0.6
    });

    console.log('[TFJS] Handpose model loaded successfully.');
    return model;
  } catch (error) {
    console.error('[TFJS] Engine initialization failed:', error);
    throw error;
  }
}

/**
 * 将摄像头帧转换为 Tensor 并进行手势推理
 * @param {Object} frame onCameraFrame 回调返回的帧数据
 * @returns {Array} 标准化的 21 个关键点坐标 (结构兼容 VisionKit)
 */
async function estimateHands(frame) {
  if (!model || !tf) {
    throw new Error('TFJS model not loaded');
  }

  // 重要：tf.tidy 不支持异步函数。在异步推理中必须手动管理内存或使用 startScope/endScope。
  tf.engine().startScope();
  let tensor;
  try {
    // 1. 将 Uint8Array (RGBA) 转换为 Tensor
    tensor = tf.tensor(new Uint8Array(frame.data), [frame.height, frame.width, 4]);

    // 2. 剥离 Alpha 通道 (RGB)
    const rgb = tf.slice(tensor, [0, 0, 0], [-1, -1, 3]);

    // 3. 执行模型推理
    const predictions = await model.estimateHands(rgb, true); // true = flipHorizontal

    // 模型返回的 predictions: [{ landmarks: [[x, y, z], ...], handInViewConfidence: 0.9, ... }]
    if (predictions && predictions.length > 0) {
      const hand = predictions[0];
      
      const normalizedPoints = hand.landmarks.map(point => ({
        x: point[0] / frame.width,
        y: point[1] / frame.height,
        z: point[2]
      }));

      return {
        score: hand.handInViewConfidence,
        points: normalizedPoints,
        gesture: -1 
      };
    }
    
    return null;

  } catch (error) {
    console.error('[TFJS] Inference error:', error);
    return null;
  } finally {
    // 强制释放该作用域内产生的所有 Tensor，彻底解决内存泄漏导致的卡死
    tf.engine().endScope();
  }
}

/**
 * 释放资源
 */
function disposeEngine() {
  if (model && typeof model.dispose === 'function') {
    model.dispose();
  }
  model = null;
  tf = null;
}

module.exports = {
  initEngine,
  estimateHands,
  disposeEngine
};
