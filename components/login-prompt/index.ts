Component({
  properties: {
    title: {
      type: String,
      value: "登录后可继续",
    },
    desc: {
      type: String,
      value: "当前功能需要登录后使用。",
    },
    buttonText: {
      type: String,
      value: "去登录",
    },
  },
  methods: {
    handleLogin() {
      this.triggerEvent("login");
    },
  },
});
