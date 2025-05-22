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
    const result = {};
  
    // 合并标准参数和hash参数
    new URLSearchParams(location.search).forEach((v, k) => result[k] = v);
    const hashPart = location.hash.includes('?') 
      ? location.hash.split('?')[1] 
      : '';
    new URLSearchParams(hashPart).forEach((v, k) => result[k] = v);

    return result;
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
