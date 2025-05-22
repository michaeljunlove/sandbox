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
