Component({
  properties: {
    show: {
      type: Boolean,
      value: false
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
    },
    aiText: {
      type: String,
      value: ''
    },
    isStreaming: {
      type: Boolean,
      value: false
    }
  },

  data: {
    visible: false,
    displayText: '',
    charIndex: 0,
    phase: 'greeting'
  },

  observers: {
    'show': function (val) {
      if (val) {
        this.setData({ visible: true, phase: 'greeting', charIndex: 0 });
        this._typeText(this.data.greeting, () => {
          this.setData({ phase: 'eyeTip', charIndex: 0 });
          this._typeText(this.data.eyeTip, () => {
            this.setData({ phase: 'actionTip', charIndex: 0 });
            this._typeText(this.data.actionTip, () => {
              this.setData({ phase: 'done' });
            });
          });
        });
      } else {
        this.setData({ visible: false });
      }
    },
    'aiText': function (val) {
      if (this.data.isStreaming) {
        this.setData({ displayText: val });
      }
    }
  },

  methods: {
    _typeText(text, callback) {
      if (!text) { callback && callback(); return; }
      let i = 0;
      this._typeTimer = setInterval(() => {
        if (i < text.length) {
          this.setData({ displayText: text.substring(0, i + 1) });
          i++;
        } else {
          clearInterval(this._typeTimer);
          setTimeout(() => { callback && callback(); }, 600);
        }
      }, 60);
    },

    onTapDialog() {
      if (this._typeTimer) clearInterval(this._typeTimer);
      this.setData({ displayText: '', visible: false, phase: 'done' });
      this.triggerEvent('dismiss');
    },

    onDismiss() {
      if (this._typeTimer) clearInterval(this._typeTimer);
      this.setData({ visible: false });
      this.triggerEvent('dismiss');
    }
  }
});
