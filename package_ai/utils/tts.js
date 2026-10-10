const config = require('./config');

const TTS_VOICE_ID = 501001;

let _audioContext = null;
let _audioQueue = [];
let _isPlaying = false;

function _getAudioContext() {
  if (!_audioContext) {
    _audioContext = wx.createInnerAudioContext();
    _audioContext.onEnded(() => {
      _isPlaying = false;
      _playNext();
    });
    _audioContext.onError(() => {
      _isPlaying = false;
      _playNext();
    });
  }
  return _audioContext;
}

function _playNext() {
  if (_audioQueue.length > 0) {
    const nextUrl = _audioQueue.shift();
    _isPlaying = true;
    const ctx = _getAudioContext();
    ctx.src = nextUrl;
    ctx.play();
  }
}

function speak(text) {
  if (!text || !text.trim()) return;

  const url = `${config.apiUrl.replace('/chat/completions', '')}/audio/speech`;

  wx.request({
    url: url,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    data: {
      model: 'tts-1',
      voice_id: TTS_VOICE_ID,
      input: text,
      response_format: 'mp3'
    },
    responseType: 'arraybuffer',
    success(res) {
      if (res.statusCode === 200 && res.data) {
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`;
        try {
          fs.writeFile({
            filePath: filePath,
            data: res.data,
            encoding: 'binary',
            success() {
              _audioQueue.push(filePath);
              if (!_isPlaying) {
                _playNext();
              }
            }
          });
        } catch (e) {
          console.error('TTS写入文件失败:', e);
        }
      }
    },
    fail(e) {
      console.error('TTS请求失败:', e);
    }
  });
}

function speakStreamBuffer(textBuffer) {
  const text = textBuffer.trim();
  if (!text) return;

  const sentences = text.match(/[^。！？；\n]+[。！？；\n]?/g);
  if (!sentences) return;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim();
    if (s && s.length > 1) {
      speak(s);
    }
  }
}

function stop() {
  _audioQueue = [];
  _isPlaying = false;
  if (_audioContext) {
    _audioContext.stop();
  }
}

function isPlaying() {
  return _isPlaying;
}

module.exports = {
  speak,
  speakStreamBuffer,
  stop,
  isPlaying
};
