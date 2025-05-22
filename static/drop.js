/**
 * AI Code预览页渲染注入脚本
 */

/**
 * 全局变量定义
 */
window._Global = {
  // prompt起始词
  promptStart: `你是一位精通 Tailwind CSS、Vant4、Vue3 的前端开发专家。
  你的核心任务是根据后续提供的 **文本描述**，在上一次生成代码后的基础之上、进行样式或者布局精准调整。
  **最关键的目标之一是：必须通过 Tailwind CSS 精确覆盖 Vant 组件的默认样式，确保最终视觉效果与 文本描述 完全一致。
  **文本描述 绝对优先，Vant 样式必须覆盖 (核心要求中的核心):**\n`,
  // 当前选中节点
  currSelectedDom: null,
  // 删除节点列表
  delDomList: [],
  // 配置节点数组
  configDomList: [],
  // 复制节点数组
  copyDomList: [],
  elementIsMove: false,
  // 当前hover元素
  currHoverDom: null,
  historyActionArr: [],
  // 用户是否按了shift
  shiftOn:false,
  // 点击节点的时候保存DOM节点,用于撤销用
  whenClickDOM:null,
  // 多选的DOM节点插入
  whenShfitOnDom:[],
  // 当前添加的交互组件
  actionComponentApp: null
};
/**
 * 保存的历史记录
 */
window.saveHistoryArr = [];


/**
 * 工具类
 */
var Utils = {
  // PascalCase转kebab-case
  pascalToKebab: function (pascal) {
    return pascal
      .replace(/[A-Z]/g, (match) => "-" + match.toLowerCase())
      .slice(1);
  },
  // kebab-case转camelCase
  kebabToCamel: function (str) {
    if (!str || typeof str !== "string") {
      return str;
    }
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  },
  // 是否为文本节点
  isOnlyTextNode: function (node) {
    return (
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE &&
        node.childNodes.length === 1 &&
        node.firstChild.nodeType === Node.TEXT_NODE)
    );
  },
  // 获取顶层元素标签
  getTopTagStringWithAttributes: function (node) {
    if (node && node.tagName) {
      const tagName = node.tagName.toLowerCase();
      const attributes = Array.from(node.attributes)
        .map((attr) => {
          if (attr.name === "style") {
            return "";
          } else {
            return `${attr.name}="${attr.value.replaceAll("dragging", "")}"`;
          }
        })
        .join(" ");

      return attributes
        ? `<${tagName} ${attributes}></${tagName}>`
        : `<${tagName} />`;
    }
    return null;
  },
  // 获取url参数
  getParams: function () {
    var hash = window.location.hash;
    var queryString = hash.split("?")[1];
    var params = new URLSearchParams(queryString);
    return params;
  },
  // 通过坐标查找元素
  getElementAtPosition: function (x, y) {
    var element = document.elementFromPoint(x, y);
    return element;
  },
  describeDOMNode: function (node) {
    if (!node?.nodeType || node.nodeType !== 1) return "Invalid DOM element";

    // 基础信息提取
    const tag = node.tagName.toLowerCase();
    const id = node.id ? `ID="${node.id}"` : "";
    const classes = node.className ? `class="${node.className}"` : "";

    // 关键属性收集（可扩展）
    const attrs = [];
    ["href", "src", "alt", "title", "role", "type", "value"].forEach((attr) => {
      if (node.hasAttribute(attr))
        attrs.push(`${attr}="${node.getAttribute(attr)}"`);
    });

    // ARIA 属性特殊处理
    Array.from(node.attributes)
      .filter((attr) => attr.name.startsWith("aria-"))
      .forEach((attr) => attrs.push(`${attr.name}="${attr.value}"`));

    // 上下文信息构建
    const parent = node.parentElement;
    const parentInfo = parent
      ? `${parent.tagName.toLowerCase()}${parent.id ? `#${parent.id}` : ""}`
      : "document";
    const position = parent ? Array.from(parent.children).indexOf(node) + 1 : 0;

    // 内容描述
    const text = node.textContent.trim().replace(/\s+/g, " ");
    const contentDesc = text
      ? `包含文本内容："${text.slice(0, 100)}"`
      : "无文本内容";

    // 结构描述
    const childElements = node.children.length;
    const childrenDesc = childElements
      ? `包含 ${childElements} 个子元素`
      : "无子元素";

    // 可见性检测
    const style = window.getComputedStyle(node);
    const visibility =
      style.display === "none"
        ? "不可见"
        : style.visibility === "hidden"
          ? "隐藏"
          : "可见";

    // 组合描述
    return [
      `找寻一个 <${tag}> 元素`,
      ...[id, classes].filter(Boolean),
      attrs.length ? `具有属性：${attrs.join(", ")}` : "",
      `位于 ${parentInfo} 的第 ${position} 个子位置`,
      contentDesc,
      childrenDesc,
      `当前状态：${visibility}`,
      `完整选择器：${this.cssPath(node)}`,
    ]
      .filter(Boolean)
      .join(",");
  },
  // 生成 CSS 路径工具函数
  cssPath: function (node) {
    const path = [];
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let selector = node.tagName.toLowerCase();
      if (node.id) {
        selector += `#${node.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = node,
          nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          nth++;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      node = node.parentNode;
    }
    return path.join(" > ");
  },
  // 通过坐标找出最近的元素
  getClosestChildWithPosition: function (element, x, y) {
    var children = Array.from(element.children);
    var closestChild = null;
    var minDistance = Infinity;
    var position = "";
    // 遍历所有子节点，计算它们到(x, y)的距离
    children.forEach((child, index) => {
      var rect = child.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var distance = Math.sqrt(
        Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestChild = child;
        if (x <= centerX) {
          position = "before";
        } else {
          position = "after";
        }
      }
    });
    var result = {
      element: closestChild,
      position: position,
    };
    return result;
  },
  getPosition: function (element, x) {
    var rect = element.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    if (x <= centerX) {
      return "before";
    } else {
      return "after";
    }
  },
  throttle: function (fn, delay) {
    let lastTime = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastTime >= delay) {
        fn.apply(this, args);
        lastTime = now;
      }
    };
  },
  safeJsonParse: function (str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn("JSON parse error:", e);
      return defaultValue;
    }
  },
  safeJsonStringify: function (obj, defaultValue = null) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      console.warn("JSON stringify error:", e);
      return defaultValue;
    }
  },
  // 根据属性名找出组件
  findComponentWithAttr: function (rootElement, attributeName) {
    let result = [];
    // 检查当前元素是否有指定的属性
    if (rootElement.hasAttribute(attributeName)) {
      result.push(rootElement);
    }
    // 递归遍历所有子元素
    for (let child of rootElement.children) {
      result =[...new Set([...result, ...this.findComponentWithAttr(child, attributeName)])]
    }
    return result
  },
  // 去除节点数组被包含的子节点
  filterContainedNodes: function (nodes) {
    // 先复制数组避免修改原数组
    const nodeList = Array.from(nodes);
    const result = [];
    for (let i = 0; i < nodeList.length; i++) {
      let isContained = false;
      const current = nodeList[i];
      
      // 检查当前节点是否被其他节点包含
      for (let j = 0; j < nodeList.length; j++) {
        if (i !== j && nodeList[j].contains(current)) {
          isContained = true;
          break;
        }
      }
      
      if (!isContained) {
        result.push(current)
      }
    }
    return result
  }
};

/**
 * 业务模块
 */
var Business = {
  // 生成虚拟画布
  renderCanvas: function () {
    // var canvasDom = document.createElement('div')
    // canvasDom.style.width = "100%"
    // canvasDom.style.height = "100%"
    // canvasDom.style.position = "relative"
    // canvasDom.style.top = "0"
    // canvasDom.style.left = "0"
    // canvasDom.style.zIndex = "100"
    // canvasDom.style.backgroundColor = "rgba(0,0,0,0.5)"
    document.body.style.position = "relative";
    // document.body.appendChild(canvasDom)
  },
  // 注入选中高亮样式
  addDragStyles: function () {
    var style = document.createElement("style");
    var highlightOoverlay = document.createElement("div");
    highlightOoverlay.className = "highlight-overlay ";
    style.textContent = `
        .dragging {
            opacity: 0.8;
            cursor: move;
            user-select: none;
            outline: 2px dashed #f56c6c;
            outline-offset: 2px;
            z-index: 100;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        .on-hover {
            opacity: 0.8;
            cursor: move;
            user-select: none;
            outline: 2px dashed green;
            outline-offset: 2px;
            z-index: 100;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        .center-v{
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .center-h{
          display: flex;
          flex-direction: row;
          justify-content: center;
        }
        .center-vh{
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .highlight-overlay {
            opacity: 0.8;
            cursor: move;
            user-select: none;
            outline: 2px dashed green;
            outline-offset: 2px;
            z-index: 100;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        [data-parent="component-wrap"] .van-empty__image svg {
          width: 100px !important;
          height: 100px !important;
        }
        [data-parent="component-wrap"] .van-nav-bar {
          width: 300px;
        }
        [data-parent="component-wrap"] .van-divider, .van-progress {
          width: 200px;
        }
        [data-parent="component-wrap"] .van-watermark {
          width: 100px;
          height: 100px;
        }
        [data-parent="component-wrap"] .van-cell-group {
          width: 400px;
        }
        [data-parent="component-wrap"] .el-divider {
          width: 200px;
        }
        [data-parent="component-wrap"] .el-progress {
          width: 200px;
        }
        [data-parent="component-wrap"] .el-progress--circle svg {
          width: 200px !important;
          height: 200px !important;
        }
        [data-parent="component-wrap"] .el-progress--dashboard svg {
          width: 200px !important;
          height: 200px !important;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(highlightOoverlay);
  },
  // 获取dom节点的交互组件列表
  getDomActionComponentsList: function (ele = null) {
    var list = []
    _Global.configDomList.forEach(item => {
      if(item.eventElement && item.eventElement === ele) {
        list.push({...item.component})
      }
    })
    return list
  }, 
  // 点击dom节点获取属性
  getAttrsWithClick: function () {
    document.body.addEventListener("click", function (e) {
      var element = e.target;
      if(element.classList.contains("van-overlay")) return
      if (
        element.parentElement &&
        element.parentElement.getAttribute("data-parent") &&
        element.parentElement.getAttribute("data-parent") === "component-wrap"
      ) {
        element = e.target.parentElement.children[0];
      }
      e.stopPropagation();
      e.preventDefault();
      // 提取所有属性
      var attributes = element.attributes;
      var attributesObj = {};
      for (var i = 0; i < attributes.length; i++) {
        var attr = attributes[i];
        attributesObj[attr.name] = attr.value;
      }
      // 获取该元素的计算样式
      var computedStyles = window.getComputedStyle(element);
      // 创建一个对象来存储样式属性
      var stylesObj = {};
      // 遍历计算样式，获取所有的属性
      for (var i = 0; i < computedStyles.length; i++) {
        var styleName = computedStyles[i];
        stylesObj[styleName] = computedStyles.getPropertyValue(styleName);
      }
      var currCptIdx = -1;
      var desc = null;
      var props = null;
      // 判断当前选中是否新增组件 是 => 取出属性值
      if (_Global.configDomList.length > 0) {
        var index = _Global.configDomList.findIndex(
          (item) => item.element === element
        );
        var store =
          _Global.configDomList[index] && _Global.configDomList[index].store;
        if (index > -1 && store) {
          props = store._instance.proxy;
          // 删除ref
          delete props.domRef;
          currCptIdx = _Global.configDomList[index].componentId;
        }
        if (index > -1) {
          desc = _Global.configDomList[index].desc;
        }
      }
      var msg = {
        data: {
          styles: stylesObj,
          attrs: attributesObj,
          innerText: Utils.isOnlyTextNode(element)
            ? element.innerText.trim()
            : "",
          isOnlyTextNode: Utils.isOnlyTextNode(element),
          currCptIdx: currCptIdx,
          props: props,
          desc: desc,
          actionComponentsList: Business.getDomActionComponentsList(e.target)
        },
        type: "report-attrs", // 回显属性
      };
      Message.sendMessage(msg);
    });
  },
  // 检测是否开启拖拽
  doEnableDrag: function () {
    var params = Utils.getParams();
    if (params.get("canvas")) {
      Business.enableUniversalDrag();
    }
  },
  // 开启拖拽
  enableUniversalDrag: function () {
    // 记录拖拽初始状态
    let isDragging = false;
    let dragElement = null;
    let initialX = 0;
    let initialY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    // 判断元素是否可拖拽（可自定义排除条件）
    function isElementDraggable(element) {
      // 默认所有元素可拖拽，除了以下情况：
      // 1. 元素是body
      // 2. 元素或其祖先设置了data-no-drag属性
      if (element === document.body) return false;
      if (element.closest("[data-no-drag]")) return false;

      return true;
    }

    // 鼠标按下事件处理
    function handleMouseDown(e) {
      // clone节点
      _Global.whenClickDOM = e.target.cloneNode(true);
      // 鼠标点击时，清空移动的框
      let highlightOverlayDoms =
        document.getElementsByClassName("highlight-overlay");
      for (let i = 0; i < highlightOverlayDoms.length; i++) {
        highlightOverlayDoms[i].classList.remove("highlight-overlay");
      }
      // 如果用户没有按住了shfit按钮，则清楚掉目前的粉红色框
      if(!_Global.shiftOn){
        for (let i = 0; i < _Global.whenShfitOnDom.length; i++) {
          _Global.whenShfitOnDom[i].classList.remove("dragging");
        }
        // 置空
        _Global.whenShfitOnDom=[]
      }else{
        _Global.whenShfitOnDom.push(e.target)
      }
      
      // 只响应左键点击
      if (e.button !== 0) return;
      // 检查目标元素是否可拖拽
      let target = e.target;
      // 如果用户又点了已经选中的节点，则取消选中状态
      if(target ===_Global.currSelectedDom){
        _Global.currSelectedDom.classList.remove("dragging");
        _Global.currSelectedDom=null;
        return
      }
      while (target && target !== document.body) {
        if (_Global.currSelectedDom && !window._Global.shiftOn) {
          _Global.currSelectedDom.classList.remove("dragging");
        }
        _Global.currSelectedDom = target;
        _Global.elementIsMove = false;
        target.classList.add("dragging");
        // target.style.border = '1px dashed #f56c6c';
        // target.style.outlineOffset = "2px"
        // outline-offset: 2px;
        if (isElementDraggable(target)) {
          // 检查元素或其父元素是否有position样式
          let position = window.getComputedStyle(target).position;
          if (position === "static") {
            // 为静态定位元素添加relative定位以支持拖拽
            target.style.position = "relative";
          }

          // 设置拖拽初始状态
          isDragging = true;
          dragElement = target;
          if (
            target.parentElement.getAttribute("data-parent") ===
            "component-wrap"
          ) {
            dragElement = target.parentElement;
            target = target.parentElement;
          }
          initialX = e.clientX;
          initialY = e.clientY;
          initialLeft = parseInt(target.style.left || "0", 10);
          initialTop = parseInt(target.style.top || "0", 10);

          // 阻止事件冒泡，避免多个元素同时被拖拽
          e.stopPropagation();
          e.preventDefault();
          break;
        }
        target = target.parentElement;
      }
    }

    // 鼠标移动事件处理
    function handleMouseMove(e) {
      if (!isDragging || !dragElement) {
        return;
      }
      if (!_Global.elementIsMove) {
        _Global.elementIsMove = true;
      }
      // 计算移动距离
      const deltaX = e.clientX - initialX;
      const deltaY = e.clientY - initialY;

      // 更新元素位置
      dragElement.style.left = `${initialLeft + deltaX}px`;
      dragElement.style.top = `${initialTop + deltaY}px`;

      e.preventDefault();
    }

    // 鼠标释放事件处理
    function handleMouseUp(e) {
      // e.target.style.border = '';
      if (isDragging && dragElement) {
        // 移除拖拽样式类
        // 节点名称
        let nodeName = dragElement.nodeName.toLowerCase();
        // 节点文案
        let innerText = dragElement.innerText;
        // 节点样式
        let className = dragElement.className;
        // 节点style
        let dragStyle = dragElement.getAttribute("style");
        // 是否有拖拽标识
        // var isDraged = dragStyle.split(";")
        let dragText = "";
        let leftValue = 0;
        let topValue = 0;
        if (_Global.elementIsMove && dragStyle && dragStyle.length > 0) {
          _Global.elementIsMove = false;
          let dragStyleArr = [];
          dragStyleArr = dragStyle.split(";");
          for (let i = 0; i < dragStyleArr.length; i++) {
            if (dragStyleArr[i].indexOf("left") > 0) {
              leftValue = dragStyleArr[i].split(":")[1].replace("px", "");
              if (leftValue > 0) {
                dragText += `left属性值:${leftValue}px;`;
              } else if (leftValue < 0) {
                dragText += `left属性值:${leftValue}px;`;
              }
            }
            if (dragStyleArr[i].indexOf("top") > 0) {
              topValue = dragStyleArr[i].split(":")[1].replace("px", "");
              if (topValue < 0) {
                dragText += `top属性值:${topValue}px;`;
              } else if (topValue > 0) {
                dragText += `top属性值:${topValue}px;`;
              }
            }
          }
          // 判断当前数组中是否存在
          var index = _Global.configDomList.findIndex(
            (item) => item.element === dragElement
          );
          // 若为组件容器 则指向组件
          if (dragElement.getAttribute("data-parent") === "component-wrap") {
            index = _Global.configDomList.findIndex(
              (item) => item.element === dragElement.children[0]
            );
          }
          // 存在  则进行修改
          if (index !== -1) {
            _Global.configDomList[index].styles.top = topValue + "px";
            _Global.configDomList[index].styles.left = leftValue + "px";
            _Global.configDomList[index].styles.position = "relative";
          } else {
            _Global.configDomList.push({
              type: "drag",
              element: dragElement,
              styles: {
                top: topValue + "px",
                left: leftValue + "px",
                position: "relative",
              },
            });
          }
        }
      }

      // 重置拖拽状态
      isDragging = false;
      dragElement = null;
    }
    function handleMouseMout(e) {
      e.target.classList.remove("highlight-overlay");
    }

    function handleMouseEnter(e) {
      let highlightOverlayDoms =
        document.getElementsByClassName("highlight-overlay");
      for (let i = 0; i < highlightOverlayDoms.length; i++) {
        highlightOverlayDoms[i].classList.remove("highlight-overlay");
      }
      if (e.target.classList && !e.target.classList.contains("dragging")) {
        e.target.classList.add("highlight-overlay");
      }
    }

    // 添加事件监听器（使用捕获阶段确保能捕获到所有事件）
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener(
      "mouseenter",
      Utils.throttle(handleMouseEnter, 100),
      true
    );
    document.addEventListener("mouseout", handleMouseMout, true);

    // 返回一个禁用拖拽的函数
    return function disableUniversalDrag() {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("mouseout", handleMouseMout, true);
      document.removeEventListener("mouseenter", handleMouseEnter, true);
    };
  },
  // 执行复制
  acceptCopy: function () {
    // 组件clone
    if (
      _Global.currSelectedDom.parentElement.getAttribute("data-parent") ===
      "component-wrap"
    ) {
      const clonedNode = _Global.currSelectedDom.parentElement.cloneNode(true);
      clonedNode.children[1].classList.remove("dragging");
      _Global.currSelectedDom.parentElement.parentNode.appendChild(clonedNode);
      _Global.copyDomList.push({
        sourceElemnet: _Global.currSelectedDom.parentElement,
        parentElement: _Global.currSelectedDom.parentElement.parentNode,
      });
    }
    // 普通复制
    else {
      const clonedNode = _Global.currSelectedDom.cloneNode(true);
      clonedNode.classList.remove("dragging");
      _Global.currSelectedDom.parentNode.appendChild(clonedNode);
      _Global.copyDomList.push({
        sourceElemnet: _Global.currSelectedDom,
        parentElement: _Global.currSelectedDom.parentNode,
      });
    }
    // 生成prompt
    this.renderPrompt();
  },
  // 创建组件
  createComponent: function (pos, component, type) {
    if (!pos && !component) {
      // 多选一个以上 不允许复制
      if(_Global.whenShfitOnDom.length > 1) {
        ElementPlus.ElMessage({
          message: '不允许同时复制多个元素',
          type: 'warning',
        })
        return
      }
      // 执行复制操作后唤起ai编码
      Message.sendMessage({
        type: "do-copy",
        data: null,
      });
    } else {
      // 交互组件创建
      if( type === "action" ) {
        this.renderActionComponent(component);
      } 
      // 通用组件创建
      else {
        this.renderComponent(component, pos);
      }
    }
  },
  // 生成prompt并上报
  renderPrompt: function () {
    var configDomList = _Global.configDomList;
    var delDomList = _Global.delDomList || [];
    // 判断有无变更
    // if (delDomList.length === 0 && configDomList.length === 0) return
    /**
     * 生成添加动作prompt
     */
    var configDomList = _Global.configDomList;
    var addList =
      configDomList.filter((item) => item.type === "addComponent") || [];
    var addPrompt = this.renderAddPrompt(addList);
    /**
     * 生成删除prompt
     */
    var delPrompt = this.renderDelPrompt(delDomList);
    /**
     * 生成变更prompt
     */
    var changeList =
      configDomList.filter((item) => item.type !== "addComponent" && item.type !== "actionComponent") || [];
    var actionList = configDomList.filter(item => item.type === "actionComponent") || [];
    var changePrompt = this.renderChangePrompt(changeList);
    var actionPrompt = this.renderActionPrompt(actionList, addList)
    var copyPrompt = this.renderCopyPrompt(_Global.copyDomList);
    var allPrompt =
      _Global.promptStart + addPrompt + delPrompt + changePrompt + actionPrompt + copyPrompt;
    var msg = {
      type: "report-prompt",
      data: {
        prompt: allPrompt,
      },
    };
    Message.sendMessage(msg);
  },
  // 生成添加动作prompt
  renderAddPrompt: function (list = []) {
    var addPrompt = "";
    if (list.length === 0) return addPrompt;
    list.forEach((item, index) => {
      var libName =
        item.component.name.indexOf("El") > -1 ? "Elment-Plus" : "Vant4";
      var itemStyles = item.styles;
      var insertElement = Utils.describeDOMNode(item.insertElement);
      var insertPosition =
        item.insertPosition === "before" ? "的前面" : "的后面";
      addPrompt +=
       "编号组件" + ( index + 1 ) + "描述如下:这是一个" + libName + "下的" + item.component.name + "组件,";
      var styles = Object.entries(itemStyles);
      // 行内样式解析
      if (styles.length > 0) {
        addPrompt += "该组件style属性信息如下:";
        styles.forEach(([key, value]) => {
          if(key === "centerType") {
            if (value !== "default") {
              var centerTypeMap = {
                "center-h": "水平居中",
                "center-v": "垂直居中",
                "center-vh": "水平垂直居中",
              };
              addPrompt += "布局居中方式设置为" + centerTypeMap[value] + ",";
            }
          } else {
            addPrompt += "属性" + key + "设置为" + value + ",";
          }
        });
      }
      // 组件属性解析
      var properties = Object.entries(item.store._instance.proxy);
      if (properties && properties.length > 0) {
        addPrompt += "该组件属性信息如下:";
        properties.forEach(([key, value]) => {
          if (key.indexOf("EventFor") < 0) {
            if (value !== undefined) {
              addPrompt += "属性" + key + "设置为" + value + ",";
            }
          } else {
            if (value) {
              addPrompt +=
                "绑定了" +
                key.split("EventFor")[1] +
                "事件,该事件触发后执行" +
                value +
                ",";
            }
          }
        });
      }
      // 解析补充描述
      var desc = item.desc;
      if (desc) {
        addPrompt += "***对该组件补充描述为" + desc + ",补充描述优先级更高***";
      }
      addPrompt +=
        "该组件插入至节点信息为" +
        insertElement +
        "DOM节点" +
        insertPosition +
        ".\n";
    });
    return addPrompt;
  },
  // 生成删除prompt
  renderDelPrompt: function (list = []) {
    var delPrompt = "";
    if (list.length === 0) return delPrompt;
    delPrompt += "删除以下dom节点:\n";
    list.forEach((item) => {
      delPrompt +=
        "删除节点信息为" + Utils.describeDOMNode(item.element) + "的元素.\n";
    });
    return delPrompt;
  },
  // 生成变更prompt
  renderChangePrompt: function (list = []) {
    var changePrompt = "";
    if (list.length === 0) return changePrompt;
    changePrompt += "变更以下dom节点:\n";
    list.forEach((item) => {
      var elementDesc = Utils.describeDOMNode(item.element);
      var styles = Object.entries(item.styles);
      changePrompt += "节点信息为" + elementDesc + "的style样式变更如下,";
      Object.entries(styles).forEach(([index, [key, value]]) => {
        if (key === "centerType") {
          if (value !== "default") {
            var centerTypeMap = {
              "center-h": "水平居中",
              "center-v": "垂直居中",
              "center-vh": "水平垂直居中",
            };
            changePrompt += "布局居中方式设置为" + centerTypeMap[value] + ",";
          }
        } else {
          changePrompt += "属性" + key + "设置为" + value + ",";
        }
      });
      // 生成补充描述
      var desc = item.desc;
      if (desc) {
        changePrompt +=
          "***对该节点补充描述为" + desc + ",补充描述优先级更高***";
      }
      changePrompt += ".\n";
    });
    return changePrompt;
  },
  // 生成交互组件prompt
  renderActionPrompt: function (actionList = [], addList = []) {
    if(actionList.length === 0) return ""
    var prompt = "" 
    actionList.forEach(item => {
      var libName = item.component.name.indexOf("El") > -1 ? "Elment-Plus" : "Vant4"
      prompt += `这是一个${libName}下的${item.component.name}组件,组件属性描述如下:`
      // 组件属性解析
      var properties = Object.entries(item.store._instance.proxy);
      var eventName = item.component.triggerEvent.label
      properties.forEach(([key, value]) => {
        if (properties && properties.length > 0) {
          if (key.indexOf("VModelshow") < 0) {
            if (value !== undefined && key !== "domRef") {
              // 插槽处理
              if(key.indexOf("CommonSlotFor") > -1) {
                prompt += "插槽" + key.split("CommonSlotFor")[1] + "内容设置为'" + value + "',"
              } else {
                prompt += "属性" + key + "设置为" + value + ","
              }
            }
          }
        }
      })
      prompt += "\n"
      // 判断绑定交互是组件还是普通dom节点
      var eventElementPrompt = ""
      addList.length > 0 && addList.forEach((listItem, index) => {
        // 交互行为绑定在组件上
        if(listItem.parentElement && listItem.parentElement.lastElementChild === item.eventElement) {
          eventElementPrompt = `编号组件${index+1},若编号组件${index+1}中的${eventName}与此处存在冲突,以此处描述为准`
        }
      })
      if(!eventElementPrompt) {
        eventElementPrompt = Utils.describeDOMNode(item.eventElement)
      }
      prompt += `该组件通过${eventName}事件控制其交互行为,${eventName}事件被绑定在${eventElementPrompt}.`
    })
    return prompt
  },
  // 生成复制prompt
  renderCopyPrompt: function (list = []) {
    if (list.length < 1) return "";
    var copyPrompt = "";
    list.forEach((item) => {
      copyPrompt += `基于${Utils.describeDOMNode(item.sourceElemnet)}进行复制,并插入到被复制节点的的父元素中.\n`;
    });
    return copyPrompt;
  },
  // 更新dom适配器
  updateAttrsAdapter: function (key, value) {
    // 单选直接更新
    if(_Global.whenShfitOnDom.length === 0) return this.updateAttrs(key, value)
    // 多选批量更新
    _Global.whenShfitOnDom.forEach(item => {
      this.updateAttrs(key, value, item)
    })
  },
  // 更新dom
  updateAttrs: function (key, value,currentDom) {
    var element = currentDom || _Global.currSelectedDom;
    var domArr = _Global.configDomList;
    var index = domArr.findIndex((item) => item.element === element);
    // 组件处理
    if (
      element.parentElement.getAttribute("data-parent") === "component-wrap"
    ) {
      index = domArr.findIndex(
        (item) => item.element === element.parentElement.children[0]
      );
      element = element.parentElement.children[0];
    }
    if (element) {
      if (key === "innerText") {
        element.innerText = value;
      }
      // 居中方式设置
      else if (key === "centerType") {
        // 统一清除居中方式
        element.classList.remove("center-v", "center-h", "center-vh");
        // 配置当前居中方式
        if (value !== "default") {
          element.classList.add(value);
        }
      }
      // 组件插入位置变更
      else if (key === "appendPosition") {
        this.changeAppendPosition(value);
      } else if (key === "desc") {
        // element.desc = value
      } else {
        element.style[key] =
          !isNaN(value) && value !== "" ? value + "px" : value;
      }
    }
    // 存在  则进行修改
    if (index !== -1) {
      if (key === "desc") {
        domArr[index].desc = value;
      } else {
        domArr[index].styles[key] = value;
      }
    }
    // 进行去重判断 不存在 则添加至变更数组中
    else {
      if (key === "desc") {
        domArr.push({
          type: "addAttr",
          element,
          styles: {},
          desc: value,
        });
      } else {
        domArr.push({
          type: "addAttr",
          element,
          styles: {
            [key]: value,
          },
        });
      }
    }
  },
  // 删除适配器
  deleteAdapter: function (data) {
    // 删除交互组件
    if(data) return this.deleteDom({
      type: "action",
      data: data
    })
    // 无效操作
    if(!_Global.currSelectedDom && _Global.whenShfitOnDom.length === 0) return
    // 生成删除列表
    var delList = _Global.whenShfitOnDom.length > 0 ? [..._Global.whenShfitOnDom] : [_Global.currSelectedDom]
    var componentList = []
    var addDomList = _Global.configDomList.filter(item => item.type === "addComponent")
    var actionDomList = _Global.configDomList.filter(item => item.type === "actionComponent")
     // 找寻子节点中是否包含组件
    if(addDomList.length > 0) {
      delList.forEach(item => {
        var result = Utils.findComponentWithAttr(item, "data-parent")
        componentList = [...new Set([...componentList, ...result])]
      })
      delList = [...new Set([...delList, ...componentList])]
      componentList = []
    } 
    // 找出节点列表中绑定的交互组件
    if(actionDomList.length > 0) {
      delList.forEach(item => {
        var result = Utils.findComponentWithAttr(item, "data-event")
        componentList = [...new Set([...componentList, ...result])]
      })
      delList = [...new Set([...delList, ...componentList])]
    }
    actionDomDelList = delList.filter(item => item.getAttribute("data-event"))
    addDomDelList = delList.filter(item => item.getAttribute("data-parent"))
    var filterNodes = Utils.filterContainedNodes(delList)
    // 删除交互组件
    actionDomDelList.forEach(item => {
      actionDomList.forEach(cItem => {
        if(cItem.eventElement === item) {
          Business.deleteDom({
            type: "action",
            data: {
              value: cItem.componentId
            }
          })
        }
      })
    })
    // 删除组件(被包含类)
    addDomDelList.forEach(item => {
      Business.deleteDom({
        type: "common",
        data: {
          element: item.lastElementChild
        }
      })
    })
    filterNodes.forEach(item => {
      Business.deleteDom({
        type: "common",
        data: {
          element: item
        }
      })
    })     
  },
  // 删除dom
  deleteDom: function (msg) {
    var data = msg.data
    // 交互组件删除
    if(msg.type === "action") {
      // 判断当前节点是否已配置交互组件(含事件)
      var index = _Global.configDomList.findIndex(
        (item) => item.component.componentId === data.value
      )
      // 存在 则销毁后绑定新组件
      if(index > -1) {
        var eventElement = _Global.configDomList[index].eventElement
        _Global.configDomList[index].store.unmount()
        // 销毁绑定事件
        eventElement.removeEventListener(_Global.configDomList[index].triggerEvent, _Global.configDomList[index].eventHandler)
        // 列表中移除
        _Global.configDomList.splice(index, 1)
        eventElement.click()
      }
      return
    }
    var index = _Global.configDomList.findIndex(
      (item) => item.element === data.element
    );
    // 若为组件 则取出真实dom进行查找
    if (
      data.element.parentElement.getAttribute("data-parent") ===
      "component-wrap"
    ) {
      index = _Global.configDomList.findIndex(
        (item) =>
          item.element === data.element.parentElement.children[0]
      );
    }
    // 存在  则从变更列表移除  添加至删除列表
    if (index !== -1) {
      // 非组件
      if (_Global.configDomList[index].type !== "addComponent") {
        _Global.delDomList.push(_Global.configDomList[index]);
      }
      _Global.configDomList.splice(index, 1);
    } else {
      _Global.delDomList.push({
        element: data.element,
      });
    }
    if (
      data.element.parentElement.getAttribute("data-parent") ===
      "component-wrap"
    ) {
      data.element.parentElement.remove();
    } else {
      data.element.remove();
    }
    data.element = null;
  },
  // 生成交互组件并插入
  renderActionComponent: function (
    component = {},
    bindElement = null
  ) {
    _Global.currHoverDom.classList.remove("on-hover");
    // 判断当前节点是否已配置交互组件(含事件)
    if(!bindElement) {
      var index = _Global.configDomList.findIndex(
        (item) => item.eventElement === _Global.currHoverDom && item.triggerEvent === component.triggerEvent.name
      )
      // 存在 则销毁后绑定新组件
      if(index > -1) {
        _Global.configDomList[index].store.unmount()
        // 销毁绑定事件
        _Global.currHoverDom.removeEventListener(component.triggerEvent.name, _Global.configDomList[index].eventHandler)
        // 列表中移除
        _Global.configDomList.splice(index, 1)
      }
    } 
    // 创建组件挂载元素
    var componentParent = document.createElement("span")
    document.body.appendChild(componentParent)
    var className = Utils.pascalToKebab(component.className)
    var properties = component.properties
    var componentName = component.componentName
    var createApp = Vue.createApp
    var ref = Vue.ref
    var createComponent = createApp({
      setup() {
        var domRef = ref(null);
        var props = {};
        for (var i of properties) {
          props[i.attr] = ref(i.value);
        }
        return {
          domRef,
          ...props
        };
      },
      template: this.renderTemplate(component.type === "function" ? "input" : className, properties),
    });
    var instanceComponent =
        className.indexOf("el-") > -1
          ? ElementPlus[componentName]
          : Vant[componentName]
    createComponent.use(instanceComponent).mount(componentParent)
    var controllerKey = "VModelshow"
    for (var i of properties) {
      if(i.isController) {
        controllerKey = i.attr
      }
    }
    var eventHandler = function (e) {
      // 阻止子节点事件冒泡行为
      var index = _Global.configDomList.findIndex(
        item => item.store && item.store._uid ===  createComponent._uid
      )
      var eventDom = _Global.configDomList[index].eventElement
      if(e.target!== eventDom) return 
      // 方法组件直接调用
      if(component.type === "function") {
        // 生成msg
        var msg = {...createComponent._instance.proxy}
        // 删除domRef
        delete msg.domRef
        instanceComponent(msg)
        return
      }
      createComponent._instance.proxy[controllerKey] = true
    }
    var eventElement = bindElement ? bindElement : _Global.currHoverDom
    if (!eventElement.getAttribute("data-event")) {
      eventElement.dataset.event = `event${Date.now()}`;
    }
    // 添加事件交互
    eventElement.addEventListener(component.triggerEvent.name, eventHandler)
    _Global.actionComponentApp = createComponent
    // 加入变更列表
    _Global.configDomList.push({
      component,
      componentId: component.componentId,
      element: componentParent,
      type: "actionComponent",
      styles: {
        // top: pos.y + "px",
        // left: pos.x + "px"
      },
      parentElement: componentParent,
      store: createComponent,
      eventElement: eventElement,
      triggerEvent: component.triggerEvent.name,
      eventHandler: eventHandler // 记录绑定事件句柄
    });
  },
  // 生成组件并插入
  renderComponent: function (
    component = {},
    pos = {},
    refDom = null,
    refPos = null,
    refId = null,
    layoutElementId = null
  ) {
    // 拖拽辅助线移除
    if (!refDom) {
      _Global.currHoverDom.classList.remove("on-hover");
    }
    var insertElement = refDom ? refDom : _Global.currHoverDom;
    var insertPosition = refPos ? refPos : "after";
    /**
     * 分析插入位置
     */
    // 存在子节点 进行精确查找
    if (!refPos) {
      if (_Global.currHoverDom.children.length > 0) {
        var closestChild = Utils.getClosestChildWithPosition(
          _Global.currHoverDom,
          pos.x,
          pos.y
        );
        insertElement = closestChild.element;
        insertPosition = closestChild.position;
      } else {
        insertPosition = Utils.getPosition(_Global.currHoverDom, pos.x);
      }
      // 碰撞结果为组件时
      // 则直接取碰撞组件的插入方式
      if (
        insertElement.getAttribute("data-parent") &&
        insertElement.getAttribute("data-parent") === "component-wrap"
      ) {
        var index = _Global.configDomList.findIndex(
          (item) => item.element === insertElement.children[0]
        );
        var matchResult = _Global.configDomList[index];
        insertPosition = matchResult.insertPosition;
        insertElement = matchResult.insertElement;
      } else if (
        insertElement.parentElement.getAttribute("data-parent") &&
        insertElement.parentElement.getAttribute("data-parent") ===
          "component-wrap"
      ) {
        var index = _Global.configDomList.findIndex(
          (item) => item.element === insertElement.parentElement.children[0]
        );
        var matchResult = _Global.configDomList[index];
        insertPosition = matchResult.insertPosition;
        insertElement = matchResult.insertElement;
      }
    }
    var componentParent = document.createElement("span");
    componentParent.style.zIndex = "1000";
    componentParent.style.height = "fit-content";
    componentParent.style.position = "relative";
    componentParent.style.display = "inline-block";
    var layoutElement = document.createElement("span");
    layoutElement.style.position = "absolute";
    layoutElement.style.width = "100%";
    layoutElement.style.height = "100%";
    layoutElement.style.top = "0";
    layoutElement.style.left = "0";
    layoutElement.style.index = "1000000";
    layoutElement.dataset.layout =  `layout${Date.now()}`;
    if(layoutElementId) {
      layoutElement.dataset.event = layoutElementId
    }
    // 添加组件标识
    componentParent.dataset.parent = "component-wrap";
    // 虚拟画布方式生成组件
    if (insertPosition === "before") {
      insertElement.parentNode.insertBefore(componentParent, insertElement);
    } else if (insertPosition === "after") {
      insertElement.parentNode.insertBefore(
        componentParent,
        insertElement.nextSibling
      );
    }
    var className = "";
    if (component.className instanceof Array) {
      className = component.className.map((item) => Utils.pascalToKebab(item));
    } else {
      className = Utils.pascalToKebab(component.className);
    }
    var properties = component.properties;
    var componentName = component.componentName;
    var createApp = Vue.createApp;
    var ref = Vue.ref;
    var createComponent = createApp({
      setup() {
        var domRef = ref(null);
        var props = {};
        for (var i of properties) {
          props[i.attr] = ref(i.value);
        }
        return {
          domRef,
          ...props,
        };
      },
      template: this.renderTemplate(className, properties),
    });
    let hasIcon = properties.some(
      (item) => item.attr.indexOf("IconSlotFor") > -1
    );
    if (hasIcon) {
      for (const [iconKey, iconComponent] of Object.entries(ElIcon)) {
        createComponent.component(iconKey, iconComponent);
      }
    }
    if (component.componentName instanceof Array) {
      var firstComponent =
        className.indexOf("el-") > -1
          ? ElementPlus[componentName[0]]
          : Vant[componentName[0]];
      var secondComponent =
        className.indexOf("el-") > -1
          ? ElementPlus[componentName[1]]
          : Vant[componentName[1]];
      createComponent
        .use(firstComponent)
        .use(secondComponent)
        .mount(componentParent);
    } else {
      var instanceComponent =
        className.indexOf("el-") > -1
          ? ElementPlus[componentName]
          : Vant[componentName];
      createComponent.use(instanceComponent).mount(componentParent);
    }
    // 选中节点
    Vue.nextTick(() => {
      if (_Global.currSelectedDom) {
        _Global.currSelectedDom.classList.remove("dragging");
      }
      layoutElement.classList.add("dragging");
      componentParent.appendChild(layoutElement);
      if (createComponent._instance.proxy.$refs.domRef.$el) {
        createComponent._instance.proxy.$refs.domRef.$el.style.zIndex = "-1";
        createComponent._instance.proxy.$refs.domRef.$el.style.position =
          "relative";
      } else {
        createComponent._instance.proxy.$refs.domRef.style.zIndex = "-1";
        createComponent._instance.proxy.$refs.domRef.style.position =
          "relative";
      }
      if (!refId) {
        layoutElement.click();
      }
      // 二次渲染需进行编号
      if (refId) {
        if (createComponent._instance.proxy.$refs.domRef.$el) {
          createComponent._instance.proxy.$refs.domRef.$el.dataset.mark = refId;
        } else {
          createComponent._instance.proxy.$refs.domRef.dataset.mark = refId;
        }
      }
      _Global.currSelectedDom = layoutElement;
    });
    // 加入变更列表
    _Global.configDomList.push({
      component,
      componentId: component.componentId,
      pos,
      element: createComponent._instance.proxy.$refs.domRef.$el
        ? createComponent._instance.proxy.$refs.domRef.$el
        : createComponent._instance.proxy.$refs.domRef,
      type: "addComponent",
      styles: {
        // top: pos.y + "px",
        // left: pos.x + "px"
      },
      parentElement: componentParent,
      store: createComponent,
      targetElement: _Global.currSelectedDom,
      insertPosition: insertPosition,
      insertElement: insertElement,
    });
  },
  // 根据属性生成template
  renderTemplate: function (tag, properties) {
    if (tag instanceof Array) {
      // 父组件
      var pTag = tag[0];
      // 子组件
      var cTag = tag[1];
      // 父组件属性
      var pProperties = properties.filter(
        (item) => item.attr.indexOf("PropForParent") > -1
      );
      // 子组件属性
      var cProperties = properties.filter(
        (item) => item.attr.indexOf("PropForParent") < 0
      );
      var begin = `<div ref="domRef"><${pTag} `;
      var end = `</${cTag}></${pTag}></div>`;
      var content = "";
      var textContent = ">";
      // 拼接父组件属性
      pProperties.forEach((item) => {
        content += ` :${item.attr.split("PropForParent")[1]}="${item.attr}" `;
      });
      content += `><${cTag}`;
      // 拼接子组件属性
      cProperties.forEach((item) => {
        if (item.attr.indexOf("EventFor") < 0) {
          if (item.attr === "vModel") {
            content += ` v-model="vModel"`;
          } else if (item.attr === "textContent") {
            textContent += "{{textContent}}";
          } else {
            content += ` :${item.attr}="${item.attr}" `;
          }
        }
      });
    } else {
      var begin = `<${tag} ref="domRef" `;
      var end = `</${tag}>`;
      var content = "";
      var textContent = ">";
      var iconContent = "";
      properties.forEach((item) => {
        if (item.attr.indexOf("EventFor") < 0) {
          if (item.attr === "vModel") {
            content += ` v-model="vModel"`;
          } else if (item.attr.indexOf("VModel") > -1) {
            var bindValue = item.attr.split("VModel")[1] ? `:${item.attr.split("VModel")[1]}` : ''
            content += `v-model${bindValue}="${item.attr}"`
          } else if (item.attr === "textContent") {
            textContent += "{{textContent}}";
          } else {
            content += ` :${item.attr}="${item.attr}" `;
          }
        }
        if (item.attr.indexOf("IconSlotFor") > -1) {
          iconContent = `<template #${item.attr.split("IconSlotFor")[1]}>
            <component :is="${item.attr}"></component>
          </template>`;
        }
        if (item.attr.indexOf("CommonSlotFor") > -1) {
          iconContent = `<template #${item.attr.split("CommonSlotFor")[1]}>
            {{${item.attr}}}
          </template>`;
        }
      });
    }
    console.log(begin + content + textContent + iconContent + end, "mark4444")
    return begin + content + textContent + iconContent + end
  },
  // 更新组件属性
  updateProps: function (key, value) {
    // 交互组件 直接更新
    if(_Global.actionComponentApp) {
      return _Global.actionComponentApp._instance.proxy[Utils.kebabToCamel(key)] = value
    }
    var element = _Global.currSelectedDom;
    if (
      _Global.currSelectedDom.parentElement &&
      _Global.currSelectedDom.parentElement.getAttribute("data-parent") ===
        "component-wrap"
    ) {
      element = _Global.currSelectedDom.parentElement.children[0];
    }
    var index = _Global.configDomList.findIndex(
      (item) => item.element === element
    );
    _Global.configDomList[index].store._instance.proxy[
      Utils.kebabToCamel(key)
    ] = value;
  },
  //保存DOM节点并保存内存数据
  saveDomAndMemory: function () {
    var saveConfigDomList = [];
    // 对变更节点进行编号
    window._Global.configDomList.forEach((item, index) => {
      // 判断是否存在对应属性 存在则取出 不存在则赋值
      if (!item.element.getAttribute("data-mark")) {
        item.element.dataset.mark = `element${Date.now()}${index}`;
      }
      if (item.type === "addComponent") {
        if (!item.insertElement.getAttribute("data-insert")) {
          item.insertElement.dataset.insert = `insertElement${Date.now()}${index}`;
        }
      }
      var newItem = {
        ...item,
        element: item.element.getAttribute("data-mark"),
      };
      if (item.type === "addComponent") {
        newItem.insertElement = item.insertElement.getAttribute("data-insert");
      }
      if (item.type === "actionComponent") {
        newItem.eventElement = item.eventElement.getAttribute("data-event");
      }
      saveConfigDomList.push(newItem);
    });
    var allHtml = document.getElementById("app").innerHTML;
    const now = new Date();
    const timeStr = now
      .toLocaleTimeString("zh-CN", {
        hour12: false, // 24小时制
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/:/g, "-");
    let saveDomObject = {
      time: timeStr,
      html: allHtml,
      version: `V${saveHistoryArr.length + 1}`,
    };
    // 记录版本数据  保存操作为版本号自增 故可直接push
    _Global.historyActionArr.push({
      delDomList: [...window._Global.delDomList],
      configDomList: [...saveConfigDomList],
    });
    saveHistoryArr.push(saveDomObject);
  },
  //清楚内存中的key
  clearSaveHistory: function () {
    saveHistoryArr = [];
  },
  renderDomAndMemory: function (data) {
    let tempVersion = null;
    for (let i = 0; i < saveHistoryArr.length; i++) {
      if (saveHistoryArr[i].version === data.version) {
        tempVersion = saveHistoryArr[i];
        break;
      }
    }
    // 存在记录版本号
    if (tempVersion) {
      var versionIdx = data.version.split("V")[1] - 1;
      var delDomList = [..._Global.historyActionArr[versionIdx].delDomList];
      var configDomList = [
        ..._Global.historyActionArr[versionIdx].configDomList,
      ];
      // 先还原dom节点 便于后续重新链接
      document.getElementById("app").innerHTML = tempVersion.html;
      // 清空状态数据
      window._Global.delDomList = delDomList.concat();
      window._Global.configDomList = [];
      // 建立链接关系
      configDomList.forEach((item, index) => {
        var newItem = {
          type: item.type,
          styles: item.styles,
        };
        const elementId = item.element;
        var findElement = document.querySelector(`[data-mark="${elementId}"]`);
        newItem.element = findElement;
        if (item.type === "addComponent") {
          var findInsertElement = document.querySelector(
            `[data-insert="${item.insertElement}"]`
          );
          newItem.insertElement = findInsertElement;
          // 重新渲染组件
          var initComponents = data.initComponents;
          var currComponent = initComponents[item.componentId];
          var layoutElementId = item.parentElement.lastElementChild.getAttribute("data-event")
          if (currComponent) {
            // 销毁失效组件
            findElement.parentNode.remove();
            // 配置列表中移除
            window._Global.configDomList.splice(index, 1);
            // 重新生成
            this.renderComponent(
              currComponent,
              item.pos,
              findInsertElement,
              item.insertPosition,
              elementId,
              layoutElementId
            );
          }
        } else if (item.type === "actionComponent") {
          var itemInterval = setInterval(function () {
            var findEventElement = document.querySelector(`[data-event="${item.eventElement}"]`)
            if(findEventElement) {
              Business.renderActionComponent(item.component, findEventElement)
              clearInterval(itemInterval)
              itemInterval = null
            }
          }, 20)
        } else {
          window._Global.configDomList.push(newItem);
        }
      });
    }
  },
  // 组件位置变更
  changeAppendPosition: function (value = "end") {
    var element = _Global.currSelectedDom;
    var index = _Global.configDomList.findIndex(
      (item) => item.element === element
    );
    var parentElement = _Global.configDomList[index].parentElement;
    var targetElement = _Global.configDomList[index].targetElement;
    // 只变更dom节点位置  不需初始化组件
    _Global.configDomList[index].component.appendPosition = value;
    if (value === "start") {
      parentElement.parentNode.insertBefore(element, targetElement);
    } else if (value === "end") {
      parentElement.parentNode.insertBefore(element, targetElement.nextSibling);
    } else if (value === "in-start") {
      targetElement.prepend(element);
    } else if (value === "in-end") {
      targetElement.appendChild(element);
    }
  },
  // 高亮显示当前hover元素
  updateHoverDom: function (pos = {}) {
    var element = Utils.getElementAtPosition(pos.x, pos.y);
    if (!element) return;
    if (_Global.currHoverDom) {
      _Global.currHoverDom.classList.remove("on-hover");
    }
    element.classList.add("on-hover");
    _Global.currHoverDom = element;
  },
  // 初始版本记录添加控制
  initVersionController: function () {
    var versionInter = setInterval(() => {
      var app = document.querySelector(".app");
      if (app && app.innerHTML !== "") {
        clearInterval(versionInter);
        Business.saveDomAndMemory();
      }
    }, 10);
  },
  // 撤销同一个版本内的当前操作
  revoke: function () {
    if (window._Global.whenClickDOM) {
      document.querySelector(".dragging").replaceWith(window._Global.whenClickDOM);
      window._Global.whenClickDOM = null;
      _Global.configDomList.pop();
    }
  },
};

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

Message.addMessageListener();

window.onload = function () {
  // 点击dom节点获取属性
  Business.getAttrsWithClick();
  // 注入选中高亮样式
  Business.addDragStyles();
  // 检测是否开启拖拽
  Business.doEnableDrag();
  // 默认一进来清空
  Business.clearSaveHistory();
  // 默认一进来保存初始化的版本
  Business.initVersionController();
  // 生成虚拟画布
  Business.renderCanvas();
};
