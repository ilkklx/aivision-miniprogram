const deepseekApi = require('../../utils/deepseek-api');
const tts = require('../../utils/tts');

Component({
  properties: {
    show: {
      type: Boolean,
      value: true
    },
    greeting: {
      type: String,
      value: ''
    },
    eyeTip: {
      type: String,
      value: ''
    },
    actionTip: {
      type: String,
      value: ''
    }
  },

  data: {
    posX: 620,
    posY: 1200,
    barsActive: false,
    isRecording: false,
    showBubble: false,
    bubbleText: '',
    displayBubbleText: '',
    isTyping: false,
    bubblePosition: 'above',
    showGreeting: false,
    displayGreeting: '',
    greetingPhase: 'idle'
  },

  lifetimes: {
    attached() {
      this._startX = 0;
      this._startY = 0;
      this._startPosX = 0;
      this._startPosY = 0;
      this._hasMoved = false;
      this._lastTapTime = 0;
      this._singleTapTimer = null;
      this._recorderManager = null;
      this._streamRequestTask = null;
      this._ttsBuffer = '';
      this._ttsTimer = null;
      this._bubbleTimer = null;
      this._bubbleTypeTimer = null;
      this._typeTimer = null;
      this._isStopping = false;

      this._initVoice();
    },

    detached() {
      tts.stop();
      if (this._streamRequestTask) {
        this._streamRequestTask.abort();
      }
      clearTimeout(this._singleTapTimer);
      clearTimeout(this._bubbleTimer);
      clearInterval(this._bubbleTypeTimer);
      clearInterval(this._typeTimer);
    }
  },

  observers: {
    'greeting': function (val) {
      if (val) {
        this._showGreetingSequence();
      }
    }
  },

  methods: {
    _initVoice() {
      this._recorderManager = wx.getRecorderManager();
      this._recorderManager.onStart(() => {
        this.setData({ isRecording: true, barsActive: true });
      });
      this._recorderManager.onStop((res) => {
        if (this._isStopping) return;
        this.setData({ isRecording: false });
        if (res.duration < 800) {
          this._onVoiceFailed();
          return;
        }
        this._tryRecognizeWithApi(res.tempFilePath);
      });
      this._recorderManager.onError(() => {
        this.setData({ isRecording: false, barsActive: false });
        this._onVoiceFailed();
      });
    },

    _tryRecognizeWithApi(filePath) {
      this._showBubble('正在思考...');
      const config = require('../../utils/config');
      wx.uploadFile({
        url: 'https://api.deepseek.com/audio/transcriptions',
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${config.apiKey}`
        },
        formData: {
          model: 'whisper-1',
          language: 'zh'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              if (data.text && data.text.trim()) {
                this._onVoiceRecognized(data.text.trim());
                return;
              }
            } catch (e) {}
          }
          this._onVoiceFailed();
        },
        fail: () => {
          this._onVoiceFailed();
        }
      });
    },

    _onVoiceRecognized(text) {
      this._showBubbleWithTyping('"' + text + '"', () => {
        setTimeout(() => {
          this._startStreamChat(text);
        }, 600);
      });
    },

    _onVoiceFailed() {
      this.setData({ barsActive: true });
      this._showBubble('正在思考...');

      const prompts = [
        '请给用户一条简短的护眼小贴士',
        '请给用户一条关于保护视力的建议',
        '请给用户一条缓解眼疲劳的小技巧',
        '请给用户一条预防近视的建议'
      ];
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];

      this._streamRequestTask = deepseekApi.chatStream(
        [{ role: 'user', content: prompt }],
        (chunk, fullText) => {
          this.setData({
            displayBubbleText: fullText,
            bubbleText: fullText,
            isTyping: true,
            bubblePosition: this._calcBubblePosition()
          });
        },
        (fullText) => {
          this.setData({ barsActive: false, isTyping: false });
          this._bubbleTimer = setTimeout(() => {
            this._hideBubble();
          }, 8000);
        },
        (err) => {
          this.setData({ barsActive: false, isTyping: false });
          const msgs = [
            '没有听清，请重新说话',
            '抱歉，没听清楚，再说一次吧',
            '嗯？没听清呢，再说一遍吧'
          ];
          const msg = msgs[Math.floor(Math.random() * msgs.length)];
          this._showBubbleWithTyping(msg, () => {
            this._bubbleTimer = setTimeout(() => {
              this._hideBubble();
            }, 3000);
          });
        }
      );
    },

    _calcBubblePosition() {
      return this.data.posY > 350 ? 'above' : 'below';
    },

    _showBubble(text) {
      clearTimeout(this._bubbleTimer);
      this.setData({
        showBubble: true,
        bubbleText: text,
        displayBubbleText: text,
        isTyping: false,
        bubblePosition: this._calcBubblePosition()
      });
    },

    _showBubbleWithTyping(text, callback) {
      clearTimeout(this._bubbleTimer);
      this.setData({
        showBubble: true,
        bubbleText: text,
        displayBubbleText: '',
        isTyping: true,
        bubblePosition: this._calcBubblePosition()
      });

      let i = 0;
      clearInterval(this._bubbleTypeTimer);
      this._bubbleTypeTimer = setInterval(() => {
        if (i < text.length) {
          this.setData({ displayBubbleText: text.substring(0, i + 1) });
          i++;
        } else {
          clearInterval(this._bubbleTypeTimer);
          this.setData({ isTyping: false });
          callback && callback();
        }
      }, 40);
    },

    _hideBubble() {
      this.setData({
        showBubble: false,
        bubbleText: '',
        displayBubbleText: '',
        isTyping: false
      });
    },

    onBubbleTap() {
      this._hideBubble();
    },

    _startStreamChat(userText) {
      this.setData({ barsActive: true });
      this._showBubble('正在思考...');

      this._ttsBuffer = '';
      const history = deepseekApi.loadHistory();
      const context = deepseekApi.buildContext(
        history.concat([{ role: 'user', content: userText }])
      );

      this._streamRequestTask = deepseekApi.chatStream(
        context,
        (chunk, fullText) => {
          this.setData({
            displayBubbleText: fullText,
            bubbleText: fullText,
            isTyping: true,
            bubblePosition: this._calcBubblePosition()
          });
          this._ttsBuffer += chunk;
          this._flushTtsBuffer();
        },
        (fullText) => {
          this.setData({ barsActive: false, isTyping: false });

          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const newMessages = history.concat([
            { id: Date.now(), role: 'user', content: userText, time: timeStr, type: 'text' },
            { id: Date.now() + 1, role: 'assistant', content: fullText, time: timeStr, type: 'text' }
          ]);
          deepseekApi.saveHistory(newMessages);

          if (this._ttsBuffer.trim()) {
            tts.speak(this._ttsBuffer.trim());
            this._ttsBuffer = '';
          }

          this._bubbleTimer = setTimeout(() => {
            this._hideBubble();
          }, 8000);
        },
        (err) => {
          this.setData({ barsActive: false, isTyping: false });
          this._showBubbleWithTyping('出了点小问题，请再试一次', () => {
            this._bubbleTimer = setTimeout(() => {
              this._hideBubble();
            }, 3000);
          });
        }
      );
    },

    _flushTtsBuffer() {
      clearTimeout(this._ttsTimer);
      this._ttsTimer = setTimeout(() => {
        const text = this._ttsBuffer.trim();
        if (text) {
          const sentences = text.match(/[^。！？；\n]+[。！？；\n]?/g);
          if (sentences && sentences.length > 0) {
            const completeSentences = [];
            let remaining = '';
            for (let i = 0; i < sentences.length; i++) {
              const s = sentences[i].trim();
              if (s && /[。！？；]$/.test(s)) {
                completeSentences.push(s);
              } else {
                remaining = s;
              }
            }
            if (completeSentences.length > 0) {
              tts.speak(completeSentences.join(''));
              this._ttsBuffer = remaining;
            }
          }
        }
      }, 500);
    },

    _showGreetingSequence() {
      this.setData({ showGreeting: true, greetingPhase: 'greeting', displayGreeting: '' });
      this._typeText(this.data.greeting, () => {
        this.setData({ greetingPhase: 'eyeTip' });
        this._typeText(this.data.eyeTip, () => {
          this.setData({ greetingPhase: 'actionTip' });
          this._typeText(this.data.actionTip, () => {
            this.setData({ greetingPhase: 'done' });
            tts.speak(this.data.greeting + this.data.eyeTip + this.data.actionTip);
            setTimeout(() => {
              this.setData({ showGreeting: false });
            }, 8000);
          });
        });
      });
    },

    _typeText(text, callback) {
      if (!text) { callback && callback(); return; }
      let i = 0;
      clearInterval(this._typeTimer);
      this._typeTimer = setInterval(() => {
        if (i < text.length) {
          this.setData({ displayGreeting: text.substring(0, i + 1) });
          i++;
        } else {
          clearInterval(this._typeTimer);
          setTimeout(() => { callback && callback(); }, 500);
        }
      }, 50);
    },

    onTouchStart(e) {
      const touch = e.touches[0];
      this._startX = touch.clientX;
      this._startY = touch.clientY;
      this._startPosX = this.data.posX;
      this._startPosY = this.data.posY;
      this._hasMoved = false;
    },

    onTouchMove(e) {
      const touch = e.touches[0];
      const dx = touch.clientX - this._startX;
      const dy = touch.clientY - this._startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this._hasMoved = true;
      }

      const sysInfo = wx.getSystemInfoSync();
      const rpxRatio = 750 / sysInfo.windowWidth;
      let newX = this._startPosX + dx * rpxRatio;
      let newY = this._startPosY + dy * rpxRatio;

      newX = Math.max(0, Math.min(630, newX));
      newY = Math.max(0, Math.min(1400, newY));

      const updateData = { posX: newX, posY: newY };

      if (this.data.showBubble) {
        updateData.bubblePosition = newY > 350 ? 'above' : 'below';
      }

      this.setData(updateData);
    },

    onTouchEnd() {
      if (!this._hasMoved) return;
      const centerX = 375;
      const snapX = this.data.posX < centerX ? 20 : 630;
      this.setData({ posX: snapX });
    },

    onTapBall() {
      if (this._hasMoved) return;

      wx.vibrateShort({ type: 'medium' });
      wx.navigateTo({ url: '/package_ai/pages/chat/chat' });
    },

    _onDoubleTap() {
      wx.vibrateShort({ type: 'heavy' });
      tts.stop();
      if (this._streamRequestTask) {
        this._streamRequestTask.abort();
      }
      this._isStopping = true;
      if (this.data.isRecording && this._recorderManager) {
        this._recorderManager.stop();
      }
      this.setData({
        barsActive: false,
        showBubble: false,
        isRecording: false
      });
      this._hideBubble();
      setTimeout(() => {
        this._isStopping = false;
      }, 500);
      wx.navigateTo({ url: '/package_ai/pages/chat/chat' });
    },

    _startRecording() {
      this._hideBubble();
      this._isStopping = false;
      this._recorderManager.start({
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        duration: 60000
      });
      this._showBubble('正在聆听...');
    },

    _stopRecording() {
      this._isStopping = false;
      if (this._recorderManager) {
        this._recorderManager.stop();
      }
    },

    onDismissGreeting() {
      if (this._typeTimer) clearInterval(this._typeTimer);
      this.setData({ showGreeting: false });
      tts.stop();
    }
  }
});
