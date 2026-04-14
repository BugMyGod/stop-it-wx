Component({
  properties: {
    options: {
      type: Array,
      value: [],
    },
    value: {
      type: String,
      value: "",
    },
  },
  methods: {
    handleSelect(event: WechatMiniprogram.TouchEvent) {
      const tone = String(event.currentTarget.dataset.tone || "");
      if (!tone) {
        return;
      }
      this.triggerEvent("change", tone);
    },
  },
});
