const config = require('./config');

const SYSTEM_PROMPT = {
  role: 'system',
  content: '你是"灵眸慧检"小程序的AI健康助手，专注于眼部健康和视力保护领域。请用简洁友好的方式回答，每次回复控制在200字以内。'
};

let _utf8Buf = [];

function _decodeUtf8(uint8Arr) {
  for (let i = 0; i < uint8Arr.length; i++) {
    _utf8Buf.push(uint8Arr[i]);
  }
  let str = '';
  let idx = 0;
  while (idx < _utf8Buf.length) {
    const b1 = _utf8Buf[idx];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
      idx++;
    } else if (b1 >= 0xC0 && b1 < 0xE0) {
      if (idx + 1 < _utf8Buf.length) {
        const b2 = _utf8Buf[idx + 1];
        str += String.fromCharCode(((b1 & 0x1F) << 6) | (b2 & 0x3F));
        idx += 2;
      } else {
        break;
      }
    } else if (b1 >= 0xE0 && b1 < 0xF0) {
      if (idx + 2 < _utf8Buf.length) {
        const b2 = _utf8Buf[idx + 1];
        const b3 = _utf8Buf[idx + 2];
        str += String.fromCharCode(((b1 & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F));
        idx += 3;
      } else {
        break;
      }
    } else if (b1 >= 0xF0) {
      if (idx + 3 < _utf8Buf.length) {
        const b2 = _utf8Buf[idx + 1];
        const b3 = _utf8Buf[idx + 2];
        const b4 = _utf8Buf[idx + 3];
        let cp = ((b1 & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F);
        cp -= 0x10000;
        str += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        idx += 4;
      } else {
        break;
      }
    } else {
      idx++;
    }
  }
  _utf8Buf = _utf8Buf.slice(idx);
  return str;
}

function chat(messages) {
  return new Promise((resolve, reject) => {
    const context = [SYSTEM_PROMPT, ...messages];
    wx.request({
      url: config.apiUrl,
      method: 'POST',
      timeout: config.timeout,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      data: {
        model: config.model,
        messages: context,
        max_tokens: config.maxTokens,
        temperature: config.temperature
      },
      success(res) {
        if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
          resolve(res.data.choices[0].message.content);
        } else {
          reject(new Error(res.data?.error?.message || `请求失败(${res.statusCode})`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

function chatStream(messages, onChunk, onDone, onError) {
  const context = [SYSTEM_PROMPT, ...messages];
  let fullText = '';
  let requestTask = null;
  let buffer = '';
  _utf8Buf = [];

  try {
    requestTask = wx.request({
      url: config.apiUrl,
      method: 'POST',
      timeout: config.timeout,
      enableChunked: true,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'text/event-stream'
      },
      data: {
        model: config.model,
        messages: context,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true
      },
      success(res) {
        if (res.statusCode === 200) {
          if (res.data && res.data.choices && res.data.choices.length > 0) {
            fullText = res.data.choices[0].message?.content || '';
            onDone && onDone(fullText);
          }
        } else {
          onError && onError(new Error(`请求失败(${res.statusCode})`));
        }
      },
      fail(err) {
        onError && onError(new Error(err.errMsg || '网络请求失败'));
      }
    });

    if (requestTask && requestTask.onChunkReceived) {
      requestTask.onChunkReceived((res) => {
        try {
          const uint8Arr = new Uint8Array(res.data);
          const text = _decodeUtf8(uint8Arr);
          buffer += text;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              if (dataStr === '[DONE]') {
                onDone && onDone(fullText);
                return;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                  const content = data.choices[0].delta.content || '';
                  if (content) {
                    fullText += content;
                    onChunk && onChunk(content, fullText);
                  }
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      });
    }
  } catch (e) {
    onError && onError(e);
  }

  return requestTask;
}

const HISTORY_KEY = 'ai_chat_history';
const MAX_HISTORY_MESSAGES = 50;
const MAX_CONTEXT_ROUNDS = 10;

function saveHistory(messages) {
  try {
    wx.setStorageSync(HISTORY_KEY, messages.slice(-MAX_HISTORY_MESSAGES));
  } catch (e) {
    console.error('保存对话历史失败:', e);
  }
}

function loadHistory() {
  try {
    return wx.getStorageSync(HISTORY_KEY) || [];
  } catch (e) {
    return [];
  }
}

function clearHistory() {
  try {
    wx.removeStorageSync(HISTORY_KEY);
  } catch (e) {
    console.error('清除对话历史失败:', e);
  }
}

function buildContext(messages) {
  const recent = messages.slice(-(MAX_CONTEXT_ROUNDS * 2));
  return recent.map(m => ({
    role: m.role,
    content: m.content
  }));
}

module.exports = {
  chat,
  chatStream,
  saveHistory,
  loadHistory,
  clearHistory,
  buildContext
};
