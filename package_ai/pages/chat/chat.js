const deepseekApi = require('../../../utils/deepseek-api');
const tts = require('../../../utils/tts');

Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToView: '',
    isVoiceMode: false,
    isRecording: false,
    language: 'zh',
    t: null,
    quickQuestions: []
  },

  _msgIdCounter: 0,

  onLoad() {
    this.updateLanguage();
    this.loadChatHistory();
    this._initVoiceRecognition();
  },

  onShow() {
    this.scrollToBottom(500);
  },

  onUnload() {
    if (this._recorderManager) {
      this._recorderManager.stop();
    }
    tts.stop();
  },

  updateLanguage() {
    const app = getApp();
    const t = app.globalData.t;
    this.setData({
      language: app.globalData.language,
      t: t,
      quickQuestions: t.chat.quickQuestions || []
    });
  },

  loadChatHistory() {
    const history = deepseekApi.loadHistory();
    if (history.length > 0) {
      this.setData({ messages: history });
      this.scrollToBottom(600);
    }
  },

  _initVoiceRecognition() {
    this._recorderManager = wx.getRecorderManager();
    this._recorderManager.onStart(() => {
      this.setData({ isRecording: true });
    });
    this._recorderManager.onStop((res) => {
      this.setData({ isRecording: false });
      if (res.duration < 800) {
        wx.showToast({ title: '说话时间太短', icon: 'none' });
        return;
      }
      this._recognizeVoice(res.tempFilePath);
    });
    this._recorderManager.onError(() => {
      this.setData({ isRecording: false });
    });
  },

  _recognizeVoice(filePath) {
    wx.showLoading({ title: '识别中...' });
    const config = require('../../../utils/config');
    wx.uploadFile({
      url: 'https://api.deepseek.com/audio/transcriptions',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      formData: {
        model: 'whisper-1',
        language: this.data.language === 'zh' ? 'zh' : 'en'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.text && data.text.trim()) {
              this.setData({ inputValue: data.text.trim() });
              this.sendMessage();
              return;
            }
          } catch (e) {}
        }
        wx.showToast({ title: '识别失败，请手动输入', icon: 'none' });
        this.setData({ isVoiceMode: false });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请手动输入', icon: 'none' });
        this.setData({ isVoiceMode: false });
      }
    });
  },

  toggleInputMode() {
    this.setData({ isVoiceMode: !this.data.isVoiceMode });
    wx.vibrateShort({ type: 'light' });
  },

  onVoiceStart() {
    wx.vibrateShort({ type: 'light' });
    this._recorderManager.start({
      format: 'mp3',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      duration: 60000
    });
  },

  onVoiceEnd() {
    if (this.data.isRecording) {
      this._recorderManager.stop();
    }
  },

  onVoiceCancel() {
    if (this.data.isRecording) {
      this._recorderManager.stop();
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onQuickQuestion(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputValue: text });
    this.sendMessage();
  },

  sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content || this.data.isLoading) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg = {
      id: ++this._msgIdCounter,
      role: 'user',
      content: content,
      time: timeStr,
      type: 'text'
    };

    const messages = this.data.messages.concat(userMsg);
    this.setData({
      messages: messages,
      inputValue: '',
      isLoading: true
    });
    this.scrollToBottom();

    const context = deepseekApi.buildContext(messages);
    let fullReply = '';
    let ttsBuffer = '';
    let ttsTimer = null;

    const flushTts = () => {
      clearTimeout(ttsTimer);
      ttsTimer = setTimeout(() => {
        const text = ttsBuffer.trim();
        if (text) {
          const sentences = text.match(/[^。！？；\n]+[。！？；\n]?/g);
          if (sentences) {
            const complete = [];
            let remaining = '';
            for (let i = 0; i < sentences.length; i++) {
              const s = sentences[i].trim();
              if (s && /[。！？；]$/.test(s)) {
                complete.push(s);
              } else {
                remaining = s;
              }
            }
            if (complete.length > 0) {
              tts.speak(complete.join(''));
              ttsBuffer = remaining;
            }
          }
        }
      }, 500);
    };

    const streamMsg = {
      id: ++this._msgIdCounter,
      role: 'assistant',
      content: '',
      time: timeStr,
      type: 'text',
      _streaming: true
    };
    this.setData({
      messages: this.data.messages.concat(streamMsg),
      isLoading: false
    });
    this.scrollToBottom();

    this._streamTask = deepseekApi.chatStream(
      context,
      (chunk, fullText) => {
        fullReply = fullText;
        ttsBuffer += chunk;
        flushTts();

        const lastIdx = this.data.messages.length - 1;
        const lastMsg = this.data.messages[lastIdx];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg._streaming) {
          this.setData({
            [`messages[${lastIdx}].content`]: fullText
          });
        }
        this.scrollToBottom();
      },
      (fullText) => {
        clearTimeout(ttsTimer);
        if (ttsBuffer.trim()) {
          tts.speak(ttsBuffer.trim());
        }

        const replyTime = new Date();
        const replyTimeStr = `${replyTime.getHours().toString().padStart(2, '0')}:${replyTime.getMinutes().toString().padStart(2, '0')}`;

        const aiMsg = {
          id: ++this._msgIdCounter,
          role: 'assistant',
          content: fullText || fullReply,
          time: replyTimeStr,
          type: 'text',
          _streaming: false
        };

        let currentMessages = this.data.messages;
        const lastIdx = currentMessages.length - 1;
        const lastMsg = currentMessages[lastIdx];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg._streaming) {
          currentMessages[lastIdx] = aiMsg;
        } else {
          currentMessages = currentMessages.concat(aiMsg);
        }

        this.setData({
          messages: currentMessages,
          isLoading: false
        });
        deepseekApi.saveHistory(currentMessages);
        this.scrollToBottom();
      },
      (err) => {
        console.error('AI请求失败:', err);
        clearTimeout(ttsTimer);

        const aiMsg = {
          id: ++this._msgIdCounter,
          role: 'assistant',
          content: fullReply || '抱歉，请求失败了，请重试。',
          time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
          type: 'text',
          _streaming: false
        };

        let currentMessages = this.data.messages;
        const lastIdx = currentMessages.length - 1;
        const lastMsg = currentMessages[lastIdx];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg._streaming) {
          currentMessages[lastIdx] = aiMsg;
        } else {
          currentMessages = currentMessages.concat(aiMsg);
        }

        this.setData({
          messages: currentMessages,
          isLoading: false
        });
      }
    );
  },

  clearChat() {
    const self = this;
    wx.showModal({
      title: self.data.t.chat.clearConfirm,
      content: self.data.t.chat.clearConfirmContent,
      success(res) {
        if (res.confirm) {
          deepseekApi.clearHistory();
          tts.stop();
          self.setData({ messages: [] });
          self._msgIdCounter = 0;
        }
      }
    });
  },

  scrollToBottom(delay) {
    setTimeout(() => {
      this.setData({ scrollToView: 'msg-bottom' });
    }, delay || 100);
  }
});
