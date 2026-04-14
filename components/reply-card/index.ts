Component({
  properties: {
    reply: {
      type: Object,
      value: {},
    },
    index: {
      type: Number,
      value: -1,
    },
    favoriteLoading: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    emitEvent(name: string) {
      this.triggerEvent(name, {
        index: this.data.index,
        reply: this.data.reply,
      });
    },
    handleCopy() {
      this.emitEvent("copy");
    },
    handleFavorite() {
      this.emitEvent("favorite");
    },
    handleRefine() {
      this.emitEvent("refine");
    },
    handleRegenerate() {
      this.emitEvent("regenerate");
    },
  },
});
