Component({
  properties: {
    template: {
      type: Object,
      value: {},
    },
  },
  methods: {
    handleTap() {
      this.triggerEvent("select", this.data.template);
    },
  },
});
