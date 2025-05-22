/**
 * 通讯模块
 */
var Message = {
  // 开启消息订阅
  addMessageListener: function () {
    window.addEventListener("message", (event) => {
      // 只响应自定义事件(如webpack相关事件直接return)
      if (event.data.type) return;
      var data = Utils.safeJsonParse(event.data);
      if (!data) return;
      var type = data.type;
      /**
       * 消息结构体
       * {
       *   // create-component: 创建组件 render-prompt: 生成prompt
       *   // update-attrs: 更新style delete-dom: 删除元素
       *   type: "create-component",
       *   data: {} // 消息内容
       * }
       */
      switch (type) {
        case "create-component":
          var data = data.data
          var pos = data && data.pos || ""
          var component = data && data.component || ""
          var type = data && data.type || ""
          Business.createComponent(pos, component, type);
          break;
        case "render-prompt":
          Business.renderPrompt();
          break;
        case "update-attrs":
          var style = data.style;
          Business.updateAttrsAdapter(style.key, style.value)
          break;
        case "delete-dom":
          Business.deleteAdapter(data.data);
          break;
        case "update-props":
          var data = data.data;
          Business.updateProps(data.key, data.value);
          break;
        case "save-dom":
          Business.saveDomAndMemory();
          break;
        case "render-dom":
          var data = data.data;
          Business.renderDomAndMemory(data);
          break;
        case "remove-history":
          Business.clearSaveDomInLocalStorage();
        case "update-hover-dom":
          var data = data.data;
          Business.updateHoverDom(data.pos);
          break;
        case "revoke":
          Business.revoke();
          break;
        // 接受复制
        case "accept-copy":
          Business.acceptCopy();
          break;
        case "shift-on":
            _Global.shiftOn=true
            // 如果用户按shift的时候，已经有选中的DOM，需要加入进来
            if(_Global.currSelectedDom){
              _Global.whenShfitOnDom.push(_Global.currSelectedDom)
            }
            break;
        case "shift-off":
            _Global.shiftOn=false
            break;
        default:
          break;
      }
    });
  },
  // 父容器发送消息
  sendMessage: function (msg = {}) {
    /**
     * msg结构
     * {
     *   type: "", // report-prompt: 上报prompt report-attrs: 上报dom信息  do-copy: 复制操作询问确认
     *   data: {} 消息体
     * }
     */
    window.parent.postMessage(Utils.safeJsonStringify(msg), "*");
  },
};
