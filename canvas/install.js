/**
 * 画布区域装载器
 * 具体包含功能如下:
 * 1、判断是否为画布来决定是否装载对应类
 * (AI生成的工程化项目中强制加载此js文件,
 * 是否状态画布相关类,于此进行判断)
 * 2、加载依赖包(vue、vant、element-plus、@element-plus-icons-vue,后续会拓展react体系)
 * 3、加载画布实现的业务类、工具类、全局变量等
 */

/**
 * 加载网络资源方法
 * @param {String} url 资源地址
 * @param {String} type 资源类型 script、style
 */
function loadResource(url, type) {
  return new Promise((resolve, reject) => {
    const element = type === 'script' 
      ? document.createElement('script') 
      : document.createElement('link');
    
    if (type === 'script') {
      element.src = url;
      element.onload = resolve;
    } else {
      element.rel = 'stylesheet';
      element.href = url;
      resolve(); // CSS无onload事件
    }
    
    element.onerror = reject;
    document.head.appendChild(element);
  });
}

/**
 * 加载在线依赖及业务模块
 */
async function setup () {
  var domain = "http://localhost:8010/"
  try {
    // 加载基础依赖库
    await loadResource("https://cdn.tailwindcss.com", 'script');
    await loadResource(`${domain}vendors/vue@v3.5.13.js`, 'script');
    await loadResource(`${domain}vendors/element-plus@2.9.5.js`, 'script');
    await loadResource(`${domain}vendors/element-plus@2.9.5.css`, 'style');
    await loadResource(`${domain}vendors/@element-plus-icons-vue@2.3.1.js`, 'script');
    await loadResource(`${domain}vendors/vant@4.9.19.js`, 'script');
    await loadResource(`${domain}vendors/vant@4.9.19.css`, 'style');

    // 加载画布实现的业务类、工具类、全局变量等
    await loadResource(`${domain}canvas/_Global.js`, 'script');
    await loadResource(`${domain}canvas/utils.js`, 'script');
    await loadResource(`${domain}canvas/business.js`, 'script');
    await loadResource(`${domain}canvas/message.js`, 'script');

    // 开启事件订阅
    Message.addMessageListener();
    window.onload = function () {
      // 添加点击dom节点获取属性监听
      Business.getAttrsWithClick();
      // 注入选中高亮样式
      Business.addDragStyles();
      // 开启拖拽
      Business.enableUniversalDrag();
      // 默认一进来清空
      Business.clearSaveHistory();
      // 默认一进来保存初始化的版本
      Business.initVersionController();
    }
  } catch (error) {
    console.error('资源加载失败:', error);
  }
}

/**
 * 获取所有URL参数（兼容hash模式）
 * @returns {Object} 参数键值对对象
 */
function getAllUrlParams() {
  const result = {};
  
  // 合并标准参数和hash参数
  new URLSearchParams(location.search).forEach((v, k) => result[k] = v);
  const hashPart = location.hash.includes('?') 
    ? location.hash.split('?')[1] 
    : '';
  new URLSearchParams(hashPart).forEach((v, k) => result[k] = v);

  return result;
}
// html文档加载和解析完成后进行检测
document.addEventListener('DOMContentLoaded', function() {
  var params = getAllUrlParams();
  // 画布模式下启动
  if (params.canvas) return setup()
})
