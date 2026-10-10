const config = require('./config');

const SYSTEM_PROMPT = {
  role: 'system',
  content: '你是"灵眸慧检"小程序的AI健康助手，专注于眼部健康和视力保护领域。请用简洁友好的方式回答，每次回复控制在200字以内。'
};

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
          let text = '';
          for (let i = 0; i < uint8Arr.length; i++) {
            text += String.fromCharCode(uint8Arr[i]);
          }
          const lines = text.split('\n');
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
              } catch (e) {
                // skip parse errors for partial chunks
              }
            }
          }
        } catch (e) {
          // skip chunk parse errors
        }
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
