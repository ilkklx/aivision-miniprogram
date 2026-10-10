/**
 * GestureManager.js
 * 简化版手势管理器：统一封装 VisionKit 和 TFJS 引擎，抹平底层差异。
 */

const TFJSEngine = require('./tfjs-engine.js');

class GestureManager {
  constructor(page) {
    this.page = page;
    this.status = 'IDLE'; // IDLE, STARTING, RUNNING, ERROR
    this.engineType = null; // VK, TFJS
    this.vkSession = null;
    this._frameRequestId = null;
    this._cameraListener = null;
    this._listeners = {};
  }

  /**
   * 启动引擎，内置 VisionKit -> TFJS 的降级逻辑
   */
  async start(options = {}) {
    if (this.status === 'STARTING' || this.status === 'RUNNING') return;
    this._updateStatus('STARTING');

    try {
      // 1. 尝试启动 VisionKit (Native)
      await this._startVisionKit(options);
      
      // 竞态检查：如果在等待期间引擎已被停止，则立即退出
      if (this.status !== 'STARTING') {
        this._stopVisionKit();
        return;
      }

      this.engineType = 'VK';
      this._updateStatus('RUNNING');
    } catch (vkError) {
      if (this.status !== 'STARTING') return;
      console.warn('[GestureManager] VisionKit 启动失败，尝试降级到 TFJS:', vkError);
      
      try {
        // 2. 降级启动 TFJS
        await this._startTFJS(options);
        
        if (this.status !== 'STARTING') {
          this._stopTFJS();
          return;
        }

        this.engineType = 'TFJS';
        this._updateStatus('RUNNING');
      } catch (tfjsError) {
        if (this.status !== 'STARTING') return;
        console.error('[GestureManager] 所有 AI 引擎均启动失败:', tfjsError);
        this._updateStatus('ERROR', tfjsError.message);
        throw tfjsError;
      }
    }
  }

  /**
   * 停止并释放所有资源
   */
  stop() {
    this._stopVisionKit();
    this._stopTFJS();
    this._updateStatus('IDLE');
    this.engineType = null;
  }

  on(event, callback) {
    this._listeners[event] = callback;
  }

  _emit(event, data) {
    if (this._listeners[event]) this._listeners[event](data);
  }

  _updateStatus(status, error = null) {
    this.status = status;
    this._emit('statusChange', { status, error, engineType: this.engineType });
  }

  // --- VisionKit 内部逻辑 ---
  async _startVisionKit(options) {
    if (!wx.createVKSession) throw new Error('VisionKit 不支持');
    
    return new Promise((resolve, reject) => {
      this.vkSession = wx.createVKSession({
        track: { hand: { mode: 1 } },
        version: options.version || 'v2',
        gl: options.gl,
        cameraPosition: options.cameraPosition || 'front'
      });

      this.vkSession.start((err) => {
        if (err) return reject(err);
        
        this.vkSession.on('updateAnchors', (anchors) => {
        if (!anchors || !anchors.length) return;
        const main = anchors.sort((a, b) => b.score - a.score)[0];
        
        // 统一输出：解析 VisionKit 的 Gesture ID 为最终结果值
        const value = this._mapVKGestureToValue(main.gesture);
        
        this._emit('result', {
          score: main.score,
          value: value, // 统一后的结果值 (270, 0, '5', 'circle' 等)
          gesture: main.gesture,
          points: main.points,
          source: 'VK'
        });
      });

        this.vkSession.on('error', (e) => this._updateStatus('ERROR', e.errMsg));
        
        // 启动帧循环驱动
        const loop = () => {
          if (this.status !== 'RUNNING' || this.engineType !== 'VK') return;
          this.vkSession.getVKFrame(128, 128);
          this._frameRequestId = this.vkSession.requestAnimationFrame(loop);
        };
        loop();
        resolve();
      });
    });
  }

  _stopVisionKit() {
    if (this.vkSession) {
      if (this._frameRequestId) this.vkSession.cancelAnimationFrame(this._frameRequestId);
      this.vkSession.stop();
      this.vkSession.destroy();
      this.vkSession = null;
    }
    this._frameRequestId = null;
  }

  // --- TFJS 内部逻辑 ---
  async _startTFJS(options) {
    await TFJSEngine.initEngine();
    const context = wx.createCameraContext();
    this._cameraListener = context.onCameraFrame(async (frame) => {
      if (this.status !== 'RUNNING' || this.engineType !== 'TFJS' || this._isProcessing) return;
      
      this._isProcessing = true;
      const result = await TFJSEngine.estimateHands(frame);
      if (result) {
        // TFJS 模式下手动计算手势，输出统一后的结果值
        let value = -1;
        if (result.points) {
          value = this._calculateValueFromPoints(result.points);
        }
        
        this._emit('result', {
          score: result.score,
          value: value,
          points: result.points,
          source: 'TFJS'
        });
      }
      this._isProcessing = false;
    });
    this._cameraListener.start();
  }

  _stopTFJS() {
    if (this._cameraListener) this._cameraListener.stop();
    this._cameraListener = null;
    TFJSEngine.disposeEngine();
  }

  _mapVKGestureToValue(gesture) {
    const chartType = this.page.data.chartType;
    if (chartType === 'E') {
      const map = { 6: 270, 2: 0, 1: 90, 3: 180 };
      return map[gesture] !== undefined ? map[gesture] : -1;
    }
    if (chartType === 'number') {
      const map = { 1: '5', 2: '2', 4: '1', 7: '3', 9: '6', 10: '8', 12: '4', 13: '0' };
      return map[gesture] || -1;
    }
    if (chartType === 'graphic') {
      const map = { 13: 'circle', 2: 'triangle', 1: 'square' };
      return map[gesture] || -1;
    }
    return -1;
  }

  /**
   * 统一手势计算逻辑：将点位转换为结果值
   */
  _calculateValueFromPoints(points) {
    if (!points || points.length < 21) return -1;
    const chartType = this.page.data.chartType;

    if (chartType === 'E') {
      const indexTip = points[8];
      const indexBase = points[5];
      const dx = indexTip.x - indexBase.x;
      const dy = indexTip.y - indexBase.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      const tolerance = 40;
      if (Math.abs(angle + 90) < tolerance) return 270;      // 上
      if (Math.abs(angle) < tolerance) return 0;            // 右
      if (Math.abs(angle - 90) < tolerance) return 90;      // 下
      if (Math.abs(angle - 180) < tolerance || Math.abs(angle + 180) < tolerance) return 180; // 左
    } 
    else if (chartType === 'number') {
      const wrist = points[0];
      const fingerTips = [8, 12, 16, 20];
      const fingerBases = [5, 9, 13, 17];
      let extendedCount = 0;

      for (let i = 0; i < fingerTips.length; i++) {
        if (!points[fingerTips[i]] || !points[fingerBases[i]]) continue;
        const tipDist = Math.hypot(points[fingerTips[i]].x - wrist.x, points[fingerTips[i]].y - wrist.y);
        const baseDist = Math.hypot(points[fingerBases[i]].x - wrist.x, points[fingerBases[i]].y - wrist.y);
        if (tipDist > baseDist * 1.15) extendedCount++;
      }

      if (points[4] && points[2]) {
        const thumbDist = Math.hypot(points[4].x - wrist.x, points[4].y - wrist.y);
        const thumbBaseDist = Math.hypot(points[2].x - wrist.x, points[2].y - wrist.y);
        if (thumbDist > thumbBaseDist * 1.1) extendedCount++;
      }
      return String(extendedCount);
    }
    else if (chartType === 'graphic') {
      if (points[4] && points[8]) {
        const dist = Math.hypot(points[4].x - points[8].x, points[4].y - points[8].y);
        if (dist < 0.06) return 'circle';
      }
    }
    return -1; 
  }
}

module.exports = GestureManager;
