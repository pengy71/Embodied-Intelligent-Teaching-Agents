// 课程知识体系数据模型与内容
// 基于《具身智能导论》(UC Berkeley CS294-291 中文详解) 17 章真实课程内容构建
// 对应 PRD 第一阶段：课程结构化知识拆解体系 + 具身智能专属知识图谱

export type KnowledgeLevel = "chapter" | "section" | "point" | "related" | "mistake";

export interface KnowledgeModule {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface KnowledgePoint {
  id: string;
  title: string;
  summary?: string;
  prerequisites?: string[];
  related?: string[];
  cases?: string[];
  experiments?: string[];
  mistakes?: string[];
}

export interface KnowledgeSection {
  id: string;
  title: string;
  points: KnowledgePoint[];
}

export interface KnowledgeChapter {
  id: string;
  number: number;
  title: string;
  part: string;
  moduleId: string;
  summary: string;
  sections: KnowledgeSection[];
  isCaseStudy?: boolean;
}

export interface CommonMistake {
  id: string;
  pointId: string;
  title: string;
  wrong: string;
  right: string;
}

export const modules: KnowledgeModule[] = [
  { id: "foundations", name: "基础理论", color: "#3b82f6", description: "导论、生物运动力学与机器人机构学，奠定数学与生物学基础" },
  { id: "generative", name: "生成式模型", color: "#a855f7", description: "扩散模型、Score 模型、归一化流与 Flow Matching" },
  { id: "perception", name: "感知系统", color: "#06b6d4", description: "人手与机器人手、本体感觉与触觉感知" },
  { id: "motion-control", name: "运动控制", color: "#f97316", description: "运动控制发展、动力学与控制、计算神经科学" },
  { id: "world-model", name: "世界模型", color: "#8b5cf6", description: "视频世界模型、RSSM、Track2Act" },
  { id: "rl", name: "强化学习", color: "#ef4444", description: "MDP 到 SAC 的完整推导与 Sim-to-Real" },
  { id: "imitation", name: "模仿学习", color: "#22c55e", description: "行为克隆、Diffusion Policy、视觉模仿学习" },
  { id: "planning", name: "规划与操作", color: "#ec4899", description: "导航、灵巧操作与长程规划语言" },
];

export const chapters: KnowledgeChapter[] = [
  {
    id: "ch01", number: 1, title: "导论", part: "第一部分：导论与生物基础", moduleId: "foundations",
    summary: "具身智能的核心问题、数学定义、发展历程与课程三条知识主线。",
    sections: [
      { id: "ch01-s1", title: "概要", points: [
        { id: "ch01-1-1", title: "核心问题", summary: "感知-行动闭环下的智能体设计" },
        { id: "ch01-1-2", title: "Moravec 悖论", summary: "高级推理易，感知运动控制难", mistakes: ["m-moravec"] },
        { id: "ch01-1-3", title: "本章使命" },
      ]},
      { id: "ch01-s2", title: "数学基础", points: [
        { id: "ch01-2-1", title: "感知-行动闭环的概率形式化", related: ["ch10-2-1", "ch09-2-1"] },
        { id: "ch01-2-2", title: "具身的数学定义" },
        { id: "ch01-2-3", title: "模仿学习与强化学习的优化目标", related: ["ch12-2-1", "ch11-2-1"] },
      ]},
      { id: "ch01-s3", title: "具身智能发展历程", points: [
        { id: "ch01-3-1", title: "控制论时代 (1940s-1960s)：反馈的诞生" },
        { id: "ch01-3-2", title: "经典机器人学时代 (1960s-1980s)：建模与规划" },
        { id: "ch01-3-3", title: "行为主义革命 (1980s-1990s)" },
        { id: "ch01-3-4", title: "统计机器学习时期 (2000-2012)" },
        { id: "ch01-3-5", title: "深度学习革命与机器人的迟到 (2012-2020)" },
        { id: "ch01-3-6", title: "新时代：大模型与小数据 (2020-至今)" },
        { id: "ch01-3-7", title: "本课程的历史定位" },
      ]},
      { id: "ch01-s4", title: "课程架构", points: [
        { id: "ch01-4-1", title: "三条知识主线" },
        { id: "ch01-4-2", title: "三条主线的交叉关系" },
        { id: "ch01-4-3", title: "前置知识与学习路径" },
      ]},
      { id: "ch01-s5", title: "Takeaway", points: [
        { id: "ch01-5-1", title: "五个核心洞察" },
        { id: "ch01-5-2", title: "开放问题" },
      ]},
      { id: "ch01-s6", title: "练习", points: [
        { id: "ch01-6-1", title: "概念题" }, { id: "ch01-6-2", title: "数学推导" },
        { id: "ch01-6-3", title: "编程实践" }, { id: "ch01-6-4", title: "开放思考" },
      ]},
    ],
  },
  {
    id: "ch02", number: 2, title: "生物运动力学", part: "第一部分：导论与生物基础", moduleId: "foundations",
    summary: "从生物运动控制出发：CPG、动态运动基元、Tegotae 原理与生物力学。",
    sections: [
      { id: "ch02-s1", title: "概要", points: [
        { id: "ch02-1-1", title: "核心问题" },
        { id: "ch02-1-2", title: "为什么从生物学开始？" },
        { id: "ch02-1-3", title: "五大生物运动控制原则" },
        { id: "ch02-1-4", title: "与前后章节的逻辑关系", related: ["ch07-2-1"] },
      ]},
      { id: "ch02-s2", title: "核心概念与数学基础", points: [
        { id: "ch02-2-1", title: "中枢模式发生器 (CPG) 的数学理论", mistakes: ["m-cpg"] },
        { id: "ch02-2-2", title: "动态运动基元 (DMPs) 的数学推导", related: ["ch07-2-3"] },
        { id: "ch02-2-3", title: "Tegotae 原理：感觉反馈驱动的去中心化协调" },
        { id: "ch02-2-4", title: "生物力学基础：步态周期与肌肉模型" },
      ]},
      { id: "ch02-s3", title: "论文精读：Ramdya & Ijspeert (2023)", points: [
        { id: "ch02-3-1", title: "论文概况" },
        { id: "ch02-3-2", title: "核心方法论框架：四阶段互动" },
        { id: "ch02-3-3", title: "案例研究精读" },
      ]},
      { id: "ch02-s4", title: "算法与代码实现", points: [
        { id: "ch02-4-1", title: "Matsuoka CPG 振荡器" },
        { id: "ch02-4-2", title: "动态运动基元 (DMP)" },
        { id: "ch02-4-3", title: "Tegotae 负载反馈 + 四足步态生成", cases: ["ch14-s3"] },
        { id: "ch02-4-4", title: "整合演示" },
      ]},
      { id: "ch02-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch02-5-1", title: "五个核心洞察" }, { id: "ch02-5-2", title: "开放问题与研究前沿" }, { id: "ch02-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch02-s6", title: "练习与思考", points: [
        { id: "ch02-6-1", title: "数学推导" }, { id: "ch02-6-2", title: "编程练习" }, { id: "ch02-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch03", number: 3, title: "机器人机构学", part: "第一部分：导论与生物基础", moduleId: "foundations",
    summary: "李群与刚体运动、PoE 前向运动学、雅可比与逆动力学。",
    sections: [
      { id: "ch03-s1", title: "本章概要", points: [
        { id: "ch03-1-1", title: "动机与位置" },
        { id: "ch03-1-2", title: "核心问题" },
        { id: "ch03-1-3", title: "与前后章节的逻辑关系", related: ["ch08-2-1", "ch05-2-4"] },
      ]},
      { id: "ch03-s2", title: "核心概念：李群与刚体运动", points: [
        { id: "ch03-2-1", title: "刚体运动表示法全景" },
        { id: "ch03-2-2", title: "旋转运动：SO(3) 李群与 so(3) 李代数", mistakes: ["m-so3"] },
        { id: "ch03-2-3", title: "刚体变换：SE(3) 李群与 se(3) 李代数" },
        { id: "ch03-2-4", title: "前向运动学：Product-of-Exponentials (PoE)" },
        { id: "ch03-2-5", title: "速度运动学与雅可比矩阵", related: ["ch05-2-4"] },
        { id: "ch03-2-6", title: "拉格朗日动力学", related: ["ch08-2-1"] },
        { id: "ch03-2-7", title: "牛顿-欧拉逆动力学 (RNEA)" },
      ]},
      { id: "ch03-s3", title: "算法详解", points: [
        { id: "ch03-3-1", title: "SE(3) 指数映射" },
        { id: "ch03-3-2", title: "PoE 前向运动学（空间形式）" },
        { id: "ch03-3-3", title: "空间雅可比计算" },
        { id: "ch03-3-4", title: "RNEA 逆动力学" },
        { id: "ch03-3-5", title: "逆动力学的三种应用场景" },
      ]},
      { id: "ch03-s4", title: "算法与代码实现", points: [
        { id: "ch03-4-1", title: "反对称矩阵与李代数基础" },
        { id: "ch03-4-2", title: "SO(3) 与 SE(3) 的指数/对数映射" },
        { id: "ch03-4-3", title: "PoE 前向运动学与雅可比" },
        { id: "ch03-4-4", title: "递归牛顿-欧拉逆动力学 (RNEA)" },
        { id: "ch03-4-5", title: "完整示例：二连杆平面机器人验证" },
        { id: "ch03-4-6", title: "与第 2 章连接：生物关节到机器人关节的运动学类比", related: ["ch02-2-4"] },
      ]},
      { id: "ch03-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch03-5-1", title: "五个核心洞察" }, { id: "ch03-5-2", title: "开放问题与研究前沿" }, { id: "ch03-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch03-s6", title: "练习与思考", points: [
        { id: "ch03-6-1", title: "基础练习" }, { id: "ch03-6-2", title: "编程练习" }, { id: "ch03-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch04", number: 4, title: "扩散模型入门", part: "第一部分：导论与生物基础", moduleId: "generative",
    summary: "DDPM、Score 模型、归一化流与 Flow Matching 的统一视角。",
    sections: [
      { id: "ch04-s1", title: "本章概要", points: [{ id: "ch04-1-1", title: "本章概要" }] },
      { id: "ch04-s2", title: "核心概念与数学基础", points: [
        { id: "ch04-2-1", title: "Denoising Diffusion Probabilistic Models (DDPM)", mistakes: ["m-diffusion"], related: ["ch12-2-4"] },
        { id: "ch04-2-2", title: "Score-based 生成模型" },
        { id: "ch04-2-3", title: "Normalizing Flows：变量替换与可逆神经网络" },
        { id: "ch04-2-4", title: "Flow Matching：统一扩散模型与 CNF", related: ["ch10-2-4"] },
      ]},
      { id: "ch04-s3", title: "论文精读", points: [
        { id: "ch04-3-1", title: "Normalizing Flows 的统一视角 (Papamakarios 2021)" },
        { id: "ch04-3-2", title: "Flow Matching 的突破 (Lipman 2023)" },
      ]},
      { id: "ch04-s4", title: "算法与代码实现", points: [
        { id: "ch04-4-1", title: "DDPM 完整 PyTorch 实现", experiments: ["ch12-s4"] },
        { id: "ch04-4-2", title: "Continuous Normalizing Flow 实现" },
        { id: "ch04-4-3", title: "Flow Matching 实现", related: ["ch10-2-4"] },
      ]},
      { id: "ch04-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch04-5-1", title: "五个核心洞察" }, { id: "ch04-5-2", title: "延伸阅读" },
      ]},
      { id: "ch04-s6", title: "练习与思考", points: [
        { id: "ch04-6-1", title: "基础练习" }, { id: "ch04-6-2", title: "编程练习" }, { id: "ch04-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch05", number: 5, title: "人手与机器人手", part: "第一部分：导论与生物基础", moduleId: "perception",
    summary: "人手解剖学、接触运动学、抓取质量与多指手雅可比。",
    sections: [
      { id: "ch05-s1", title: "本章概要", points: [
        { id: "ch05-1-1", title: "核心问题与动机" }, { id: "ch05-1-2", title: "本章结构" },
      ]},
      { id: "ch05-s2", title: "核心概念与数学基础", points: [
        { id: "ch05-2-1", title: "人手解剖学：21+ DOF 柔性末端执行器" },
        { id: "ch05-2-2", title: "接触运动学：从手指到物体" },
        { id: "ch05-2-3", title: "抓取质量：力封闭、形封闭与抓取度量", mistakes: ["m-grasp"], related: ["ch16-2-5"] },
        { id: "ch05-2-4", title: "从接触力到关节力矩：完整因果链", prerequisites: ["ch03-2-5"] },
      ]},
      { id: "ch05-s3", title: "论文精读：A Century of Robotic Hands", points: [
        { id: "ch05-3-1", title: "论文定位与贡献" }, { id: "ch05-3-2", title: "方法论：199 款手的数据库分析" },
        { id: "ch05-3-3", title: "两条核心趋势的证据" }, { id: "ch05-3-4", title: "应用领域的驱动因素" },
        { id: "ch05-3-5", title: "范式后果：从刚性到软体操作" }, { id: "ch05-3-6", title: "论文的局限性与未回答问题" },
      ]},
      { id: "ch05-s4", title: "算法与代码实现", points: [
        { id: "ch05-4-1", title: "基础数学工具" }, { id: "ch05-4-2", title: "接触模型定义" },
        { id: "ch05-4-3", title: "抓取矩阵与力封闭判定" }, { id: "ch05-4-4", title: "多指手雅可比与指尖力反解" },
        { id: "ch05-4-5", title: "完整示例：三指手三棱柱抓取" }, { id: "ch05-4-6", title: "LEAP Hand 与简化设计原理" },
      ]},
      { id: "ch05-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch05-5-1", title: "五个核心洞察" }, { id: "ch05-5-2", title: "开放问题" }, { id: "ch05-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch05-s6", title: "练习与思考", points: [
        { id: "ch05-6-1", title: "基础练习" }, { id: "ch05-6-2", title: "编程练习" }, { id: "ch05-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch06", number: 6, title: "本体感觉与触觉感知", part: "第一部分：导论与生物基础", moduleId: "perception",
    summary: "机械感受器、神经编码、本体感觉与工程触觉传感器。",
    sections: [
      { id: "ch06-s1", title: "本章概要", points: [{ id: "ch06-1-1", title: "本章概要" }] },
      { id: "ch06-s2", title: "核心概念与数学基础", points: [
        { id: "ch06-2-1", title: "四类机械感受器的功能分类" },
        { id: "ch06-2-2", title: "机械感受器传递函数的数学模型" },
        { id: "ch06-2-3", title: "神经编码：从脉冲序列到感知" },
        { id: "ch06-2-4", title: "指尖皮肤的生物力学模型" },
        { id: "ch06-2-5", title: "本体感觉：位置、运动和力的感知", related: ["ch16-2-3"] },
        { id: "ch06-2-6", title: "工程触觉传感器模型" },
      ]},
      { id: "ch06-s3", title: "论文精读", points: [
        { id: "ch06-3-1", title: "Gardner (2010): Touch" },
        { id: "ch06-3-2", title: "Jones & Lederman (2006): Human Hand Function" },
      ]},
      { id: "ch06-s4", title: "算法与代码实现", points: [
        { id: "ch06-4-1", title: "机械感受器模拟 (tactile_model.py)" },
        { id: "ch06-4-2", title: "触觉信号处理与特征提取" },
      ]},
      { id: "ch06-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch06-5-1", title: "五个核心洞察" }, { id: "ch06-5-2", title: "三个开放问题" }, { id: "ch06-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch06-s6", title: "练习与思考", points: [
        { id: "ch06-6-1", title: "基础练习" }, { id: "ch06-6-2", title: "进阶思考" },
      ]},
    ],
  },
  {
    id: "ch07", number: 7, title: "运动控制的发展视角", part: "第二部分：控制与学习基础", moduleId: "motion-control",
    summary: "发育机器人学、跨模态蒸馏与课程学习的动力学原理。",
    sections: [
      { id: "ch07-s1", title: "本章概要", points: [{ id: "ch07-1-1", title: "本章概要" }] },
      { id: "ch07-s2", title: "核心概念与数学基础", points: [
        { id: "ch07-2-1", title: "发育机器人学的信息论基础", related: ["ch02-1-3"] },
        { id: "ch07-2-2", title: "跨模态蒸馏的数学框架", cases: ["ch14-s3"] },
        { id: "ch07-2-3", title: "课程学习的动力学原理", related: ["ch02-2-2"] },
      ]},
      { id: "ch07-s3", title: "论文精读", points: [
        { id: "ch07-3-1", title: "Learning Visual Locomotion with Cross-Modal Supervision" },
        { id: "ch07-3-2", title: "Smith & Gasser (2005): Six Lessons from Babies" },
      ]},
      { id: "ch07-s4", title: "算法与代码实现", points: [
        { id: "ch07-4-1", title: "CMS 跨模态蒸馏的 PyTorch 实现" },
        { id: "ch07-4-2", title: "代码关键设计决策" },
      ]},
      { id: "ch07-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch07-5-1", title: "五个核心洞察" }, { id: "ch07-5-2", title: "开放问题" }, { id: "ch07-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch07-s6", title: "练习与思考", points: [
        { id: "ch07-6-1", title: "基础练习" }, { id: "ch07-6-2", title: "编程实践" }, { id: "ch07-6-3", title: "深层思考" },
      ]},
    ],
  },
  {
    id: "ch08", number: 8, title: "机器人动力学与控制", part: "第二部分：控制与学习基础", moduleId: "motion-control",
    summary: "最优控制、LQR、iLQR、MPC 与内部模型。",
    sections: [
      { id: "ch08-s1", title: "本章概要", points: [
        { id: "ch08-1-1", title: "核心问题" },
        { id: "ch08-1-2", title: "生物学与工程学的交叉" },
        { id: "ch08-1-3", title: "与前后章节的关系", prerequisites: ["ch03-2-6"] },
      ]},
      { id: "ch08-s2", title: "核心概念与数学基础", points: [
        { id: "ch08-2-1", title: "最优控制问题的标准形式", prerequisites: ["ch03-2-6"] },
        { id: "ch08-2-2", title: "动态规划与贝尔曼原理", related: ["ch11-2-2"] },
        { id: "ch08-2-3", title: "线性二次型调节器 (LQR)", mistakes: ["m-lqr"] },
        { id: "ch08-2-4", title: "微分动态规划 (DDP) 与迭代 LQR (iLQR)" },
        { id: "ch08-2-5", title: "模型预测控制 (MPC)" },
        { id: "ch08-2-6", title: "内部模型：前向/逆向模型与反馈误差学习", related: ["ch09-2-1"] },
        { id: "ch08-2-7", title: "最小方差模型与轨迹规划" },
      ]},
      { id: "ch08-s3", title: "论文精读", points: [
        { id: "ch08-3-1", title: "Kawato (1999): Internal Models for Motor Control" },
        { id: "ch08-3-2", title: "Flanagan (2006): Control Strategies in Object Manipulation" },
      ]},
      { id: "ch08-s4", title: "算法与代码实现", points: [
        { id: "ch08-4-1", title: "离散时间 LQR" }, { id: "ch08-4-2", title: "迭代 LQR (iLQR)" },
        { id: "ch08-4-3", title: "模型预测控制 (MPC)" }, { id: "ch08-4-4", title: "完整示例：倒立摆 (Cart-Pole) 的 iLQR 控制" },
        { id: "ch08-4-5", title: "代码使用说明" },
      ]},
      { id: "ch08-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch08-5-1", title: "五个核心洞察" }, { id: "ch08-5-2", title: "开放问题" }, { id: "ch08-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch08-s6", title: "练习与思考", points: [
        { id: "ch08-6-1", title: "基础练习" }, { id: "ch08-6-2", title: "编程练习" }, { id: "ch08-6-3", title: "论文思考题" },
      ]},
    ],
  },
  {
    id: "ch09", number: 9, title: "计算神经科学与预测控制", part: "第二部分：控制与学习基础", moduleId: "motion-control",
    summary: "卡尔曼滤波、预测编码与自由能原理。",
    sections: [
      { id: "ch09-s1", title: "本章概要", points: [{ id: "ch09-1-1", title: "本章概要" }] },
      { id: "ch09-s2", title: "核心概念与数学基础", points: [
        { id: "ch09-2-1", title: "卡尔曼滤波：贝叶斯感觉运动整合", mistakes: ["m-kalman"], related: ["ch08-2-6"] },
        { id: "ch09-2-2", title: "预测编码：分层变分推断" },
        { id: "ch09-2-3", title: "自由能原理与主动推断" },
      ]},
      { id: "ch09-s3", title: "论文精读：Land et al. (1999) 茶实验", points: [
        { id: "ch09-3-1", title: "论文贡献陈述" }, { id: "ch09-3-2", title: "实验设计与方法" },
        { id: "ch09-3-3", title: "注视与动作的时间耦合" }, { id: "ch09-3-4", title: "四类注视功能" },
        { id: "ch09-3-5", title: "对象相关动作 (ORA) 作为行为基本单元" }, { id: "ch09-3-6", title: "补充发现与后续影响" },
      ]},
      { id: "ch09-s4", title: "算法与代码实现", points: [
        { id: "ch09-4-1", title: "卡尔曼滤波器 (Python/NumPy)" },
        { id: "ch09-4-2", title: "预测编码网络 (Python/PyTorch)" },
        { id: "ch09-4-3", title: "代码要点说明" },
      ]},
      { id: "ch09-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch09-5-1", title: "五个核心洞察" }, { id: "ch09-5-2", title: "开放问题" }, { id: "ch09-5-3", title: "延伸阅读" },
      ]},
      { id: "ch09-s6", title: "练习与思考", points: [
        { id: "ch09-6-1", title: "基础练习" }, { id: "ch09-6-2", title: "编程练习" }, { id: "ch09-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch10", number: 10, title: "视频世界模型", part: "第二部分：控制与学习基础", moduleId: "world-model",
    summary: "世界模型、RSSM、WAM 与 Track2Act。",
    sections: [
      { id: "ch10-s1", title: "本章概要", points: [{ id: "ch10-1-1", title: "本章概要" }] },
      { id: "ch10-s2", title: "核心概念与数学基础", points: [
        { id: "ch10-2-1", title: "世界模型的直觉与形式化", related: ["ch01-2-1"] },
        { id: "ch10-2-2", title: "RSSM: 循环状态空间模型", mistakes: ["m-rssm"] },
        { id: "ch10-2-3", title: "世界模型训练的变分下界" },
        { id: "ch10-2-4", title: "WAM 的联合视频-动作去噪公式", prerequisites: ["ch04-2-4"] },
        { id: "ch10-2-5", title: "Track2Act 的点轨迹预测与刚体变换推断", prerequisites: ["ch03-2-3"] },
      ]},
      { id: "ch10-s3", title: "论文精读", points: [
        { id: "ch10-3-1", title: "DreamZero: World Action Models are Zero-shot Policies" },
        { id: "ch10-3-2", title: "Track2Act: Predicting Point Tracks from Internet Videos" },
      ]},
      { id: "ch10-s4", title: "算法与代码实现", points: [
        { id: "ch10-4-1", title: "RSSM 核心实现" },
        { id: "ch10-4-2", title: "世界模型 Rollout (训练+想象力)", related: ["ch11-2-1"] },
        { id: "ch10-4-3", title: "点轨迹评估指标实现" },
        { id: "ch10-4-4", title: "WAM Flow Matching 训练伪代码" },
      ]},
      { id: "ch10-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch10-5-1", title: "五个核心洞察" }, { id: "ch10-5-2", title: "开放问题" }, { id: "ch10-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch10-s6", title: "练习与思考", points: [
        { id: "ch10-6-1", title: "基础练习" }, { id: "ch10-6-2", title: "编程练习" }, { id: "ch10-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch11", number: 11, title: "强化学习", part: "第二部分：控制与学习基础", moduleId: "rl",
    summary: "从 MDP 到 SAC 的完整推导与 Sim-to-Real 迁移。",
    sections: [
      { id: "ch11-s1", title: "本章概要", points: [{ id: "ch11-1-1", title: "本章概要" }] },
      { id: "ch11-s2", title: "数学基础：从 MDP 到 SAC", points: [
        { id: "ch11-2-1", title: "马尔可夫决策过程 (MDP) 的形式化" },
        { id: "ch11-2-2", title: "Bellman 方程与最优性证明", related: ["ch08-2-2"] },
        { id: "ch11-2-3", title: "策略梯度定理的完整证明" },
        { id: "ch11-2-4", title: "广义优势估计 (GAE)" },
        { id: "ch11-2-5", title: "PPO：信任区域策略优化", mistakes: ["m-ppo"], related: ["ch14-2-1"] },
        { id: "ch11-2-6", title: "SAC：最大熵强化学习" },
        { id: "ch11-2-7", title: "Sim-to-Real 迁移", mistakes: ["m-sim2real"], related: ["ch16-2-6"] },
      ]},
      { id: "ch11-s3", title: "关键案例分析", points: [
        { id: "ch11-3-1", title: "深度 RL 学习四足行走", cases: ["ch14-s3"] },
        { id: "ch11-3-2", title: "RL 学习灵巧手中操作", cases: ["ch16-s3"] },
      ]},
      { id: "ch11-s4", title: "算法与代码实现", points: [
        { id: "ch11-4-1", title: "PPO for Continuous Control" },
        { id: "ch11-4-2", title: "SAC for Locomotion" },
        { id: "ch11-4-3", title: "Domain Randomization Wrapper", experiments: ["ch16-s4"] },
      ]},
      { id: "ch11-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch11-5-1", title: "核心洞察" }, { id: "ch11-5-2", title: "开放问题" }, { id: "ch11-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch11-s6", title: "练习与思考", points: [
        { id: "ch11-6-1", title: "基础练习" }, { id: "ch11-6-2", title: "进阶练习" }, { id: "ch11-6-3", title: "开放研究问题" },
      ]},
    ],
  },
  {
    id: "ch12", number: 12, title: "行为克隆", part: "第三部分：学习范式与案例", moduleId: "imitation",
    summary: "BC 形式化、复合误差、DAgger 与 Diffusion Policy。",
    sections: [
      { id: "ch12-s1", title: "本章概要", points: [{ id: "ch12-1-1", title: "本章概要" }] },
      { id: "ch12-s2", title: "核心概念与数学基础", points: [
        { id: "ch12-2-1", title: "行为克隆的基本形式化", related: ["ch01-2-3"] },
        { id: "ch12-2-2", title: "BC 的复合误差分析", mistakes: ["m-bc-error"] },
        { id: "ch12-2-3", title: "DAgger：在线纠正抑制分布偏移" },
        { id: "ch12-2-4", title: "DDPM 核心数学", prerequisites: ["ch04-2-1"] },
        { id: "ch12-2-5", title: "Diffusion Policy：条件去噪过程", prerequisites: ["ch04-2-1"], related: ["ch13-2-2"] },
        { id: "ch12-2-6", title: "隐式策略的不稳定性与 Diffusion Policy 的解" },
        { id: "ch12-2-7", title: "DDIM 加速推理" },
        { id: "ch12-2-8", title: "位置控制 vs. 速度控制" },
      ]},
      { id: "ch12-s3", title: "论文精读", points: [
        { id: "ch12-3-1", title: "策略表示的分类学" }, { id: "ch12-3-2", title: "实验设计与关键结果解读" },
        { id: "ch12-3-3", title: "消融实验中的关键洞察" }, { id: "ch12-3-4", title: "局限性分析" },
      ]},
      { id: "ch12-s4", title: "算法与代码实现", points: [
        { id: "ch12-4-1", title: "噪声调度与 DDPM/DDIM 采样器", experiments: ["ch04-s4"] },
        { id: "ch12-4-2", title: "视觉编码器" }, { id: "ch12-4-3", title: "CNN-based Diffusion Policy" },
        { id: "ch12-4-4", title: "Transformer-based Diffusion Policy" },
        { id: "ch12-4-5", title: "完整训练与推理流程" }, { id: "ch12-4-6", title: "数据归一化" },
      ]},
      { id: "ch12-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch12-5-1", title: "核心洞察" }, { id: "ch12-5-2", title: "开放问题" }, { id: "ch12-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch12-s6", title: "练习与思考", points: [
        { id: "ch12-6-1", title: "基础练习" }, { id: "ch12-6-2", title: "编程练习" }, { id: "ch12-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch13", number: 13, title: "视觉模仿学习", part: "第三部分：学习范式与案例", moduleId: "imitation",
    summary: "SLAM 姿态、3D 视觉表征与跨具身策略映射。",
    sections: [
      { id: "ch13-s1", title: "本章概要", points: [{ id: "ch13-1-1", title: "本章概要" }] },
      { id: "ch13-s2", title: "核心概念与数学基础", points: [
        { id: "ch13-2-1", title: "SLAM 姿态计算：从像素到 SE(3) 位姿", prerequisites: ["ch03-2-3"] },
        { id: "ch13-2-2", title: "3D 视觉表征：从单目 RGB 到隐性深度", related: ["ch12-2-5"] },
        { id: "ch13-2-3", title: "跨具身策略映射：从手持夹爪到任意机械臂" },
      ]},
      { id: "ch13-s3", title: "论文精读：UMI", points: [
        { id: "ch13-3-1", title: "问题的精确表述" }, { id: "ch13-3-2", title: "论文的方法论架构" },
        { id: "ch13-3-3", title: "扩散策略在 UMI 中的应用", prerequisites: ["ch12-2-5"] },
        { id: "ch13-3-4", title: "关键实验分析" },
      ]},
      { id: "ch13-s4", title: "算法与代码实现", points: [
        { id: "ch13-4-1", title: "3D-Conditioned Diffusion Policy 完整实现" },
        { id: "ch13-4-2", title: "关键实现说明" },
      ]},
      { id: "ch13-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch13-5-1", title: "五个核心洞察" }, { id: "ch13-5-2", title: "局限性" }, { id: "ch13-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch13-s6", title: "练习与思考", points: [
        { id: "ch13-6-1", title: "基础练习" }, { id: "ch13-6-2", title: "编程练习" }, { id: "ch13-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch14", number: 14, title: "运动控制案例研究", part: "第三部分：学习范式与案例", moduleId: "motion-control",
    summary: "RMA 快速运动适配与自我中心视觉运动控制。", isCaseStudy: true,
    sections: [
      { id: "ch14-s1", title: "本章概要", points: [{ id: "ch14-1-1", title: "本章概要" }] },
      { id: "ch14-s2", title: "核心概念与数学基础", points: [
        { id: "ch14-2-1", title: "RMA 的 Teacher-Student 蒸馏框架", prerequisites: ["ch11-2-5", "ch11-2-6"] },
        { id: "ch14-2-2", title: "自我中心视觉运动控制的数学基础", related: ["ch07-2-2"] },
      ]},
      { id: "ch14-s3", title: "论文精读", points: [
        { id: "ch14-3-1", title: "RMA - Rapid Motor Adaptation for Legged Robots", cases: ["ch11-3-1"] },
        { id: "ch14-3-2", title: "Egocentric Locomotion in Challenging Terrains" },
      ]},
      { id: "ch14-s4", title: "算法与代码实现", points: [
        { id: "ch14-4-1", title: "完整 RMA Pipeline (PyTorch)" },
        { id: "ch14-4-2", title: "Egocentric Locomotion Phase 2 蒸馏" },
        { id: "ch14-4-3", title: "地形重建损失的关键设计" },
      ]},
      { id: "ch14-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch14-5-1", title: "五个核心洞察" }, { id: "ch14-5-2", title: "开放问题" }, { id: "ch14-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch14-s6", title: "练习与思考", points: [
        { id: "ch14-6-1", title: "基础练习" }, { id: "ch14-6-2", title: "编程练习" }, { id: "ch14-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch15", number: 15, title: "导航案例研究", part: "第三部分：学习范式与案例", moduleId: "planning",
    summary: "GOAT 目标导航与野外视觉导航的可穿越性估计。", isCaseStudy: true,
    sections: [
      { id: "ch15-s1", title: "本章概要", points: [{ id: "ch15-1-1", title: "本章概要" }] },
      { id: "ch15-s2", title: "核心概念与数学基础", points: [
        { id: "ch15-2-1", title: "导航问题的形式化定义", related: ["ch17-2-3"] },
        { id: "ch15-2-2", title: "语义地图表示：占据栅格到实例感知记忆" },
        { id: "ch15-2-3", title: "多模态目标编码与匹配" },
        { id: "ch15-2-4", title: "可穿越性估计：语义到异常检测" },
        { id: "ch15-2-5", title: "几何特征：超像素到 DINO-ViT 嵌入" },
        { id: "ch15-2-6", title: "异常检测与置信度加权" },
        { id: "ch15-2-7", title: "两种范式的对比" },
      ]},
      { id: "ch15-s3", title: "论文精读", points: [
        { id: "ch15-3-1", title: "GOAT: GO to Any Thing (RSS 2024)" },
        { id: "ch15-3-2", title: "Fast Traversability for Wild Visual Navigation (RSS 2023)" },
      ]},
      { id: "ch15-s4", title: "算法与代码实现", points: [
        { id: "ch15-4-1", title: "核心网络架构" }, { id: "ch15-4-2", title: "训练损失函数" },
        { id: "ch15-4-3", title: "在线训练循环" }, { id: "ch15-4-4", title: "训练技巧与工程细节" },
      ]},
      { id: "ch15-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch15-5-1", title: "核心洞察" }, { id: "ch15-5-2", title: "开放问题" }, { id: "ch15-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch15-s6", title: "练习与思考", points: [
        { id: "ch15-6-1", title: "基础练习" }, { id: "ch15-6-2", title: "综合思考" }, { id: "ch15-6-3", title: "代码实验" },
      ]},
    ],
  },
  {
    id: "ch16", number: 16, title: "灵巧操作案例研究", part: "第三部分：学习范式与案例", moduleId: "planning",
    summary: "阻抗/导纳控制、Sim-to-Real 与顺应性操作。", isCaseStudy: true,
    sections: [
      { id: "ch16-s1", title: "本章概要", points: [{ id: "ch16-1-1", title: "本章概要" }] },
      { id: "ch16-s2", title: "数学基础：阻抗/导纳与 Sim-to-Real", points: [
        { id: "ch16-2-1", title: "Hogan 阻抗控制 (Impedance Control)" },
        { id: "ch16-2-2", title: "导纳控制 (Admittance Control)" },
        { id: "ch16-2-3", title: "力/力矩传感的坐标变换", prerequisites: ["ch06-2-5", "ch03-2-3"] },
        { id: "ch16-2-4", title: "CoinFT 非线性标定模型" },
        { id: "ch16-2-5", title: "抓取力控制律", related: ["ch05-2-3"] },
        { id: "ch16-2-6", title: "Sim-to-Real Gap 的形式化分析", mistakes: ["m-sim2real"], related: ["ch11-2-7"] },
      ]},
      { id: "ch16-s3", title: "论文精读", points: [
        { id: "ch16-3-1", title: "Recipe - 人形机器人灵巧操作的 Sim-to-Real RL", cases: ["ch11-3-2"], prerequisites: ["ch12-2-5"] },
        { id: "ch16-3-2", title: "UMI-FT - 在野外学习顺应性操作", related: ["ch13-3-3"] },
      ]},
      { id: "ch16-s4", title: "算法与代码实现", points: [
        { id: "ch16-4-1", title: "导纳控制器 (PyTorch 完整实现)" },
        { id: "ch16-4-2", title: "接触奖励与 Sim-to-Real 域随机化", experiments: ["ch11-s4"] },
      ]},
      { id: "ch16-s5", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch16-5-1", title: "五个核心洞察" }, { id: "ch16-5-2", title: "开放问题" }, { id: "ch16-5-3", title: "推荐延伸阅读" },
      ]},
      { id: "ch16-s6", title: "练习与思考", points: [
        { id: "ch16-6-1", title: "基础练习" }, { id: "ch16-6-2", title: "编程练习" }, { id: "ch16-6-3", title: "思考题" },
      ]},
    ],
  },
  {
    id: "ch17", number: 17, title: "长程规划与语言", part: "第三部分：学习范式与案例", moduleId: "planning",
    summary: "VLA 模型、空间推理与长程规划。",
    sections: [
      { id: "ch17-s1", title: "本章概要", points: [{ id: "ch17-1-1", title: "本章概要" }] },
      { id: "ch17-s2", title: "核心概念与数学基础", points: [
        { id: "ch17-2-1", title: "Vision-Language-Action (VLA) 模型形式化", mistakes: ["m-vla"], related: ["ch12-2-5"] },
        { id: "ch17-2-2", title: "空间推理的形式化" },
        { id: "ch17-2-3", title: "长程规划 (Long-Horizon Planning)", related: ["ch15-2-1"] },
      ]},
      { id: "ch17-s3", title: "论文精读", points: [
        { id: "ch17-3-1", title: "π0.5：开放世界泛化的 VLA 模型" },
        { id: "ch17-3-2", title: "MolmoSpaces：大规模空间推理与评估生态" },
      ]},
      { id: "ch17-s4", title: "算法与代码实现", points: [
        { id: "ch17-4-1", title: "视觉编码器 - SigLIP/ViT 简化版" },
        { id: "ch17-4-2", title: "VLA 主干 - 多模态 Transformer" },
        { id: "ch17-4-3", title: "训练与推理流程" },
      ]},
      { id: "ch17-s5", title: "课程总结与未来展望", points: [
        { id: "ch17-5-1", title: "17 章知识地图" }, { id: "ch17-5-2", title: "核心开放挑战" }, { id: "ch17-5-3", title: "通向通用具身智能的路线图" },
      ]},
      { id: "ch17-s6", title: "核心 Takeaway 与延伸阅读", points: [
        { id: "ch17-6-1", title: "核心洞察" }, { id: "ch17-6-2", title: "延伸阅读" },
      ]},
      { id: "ch17-s7", title: "练习与思考", points: [
        { id: "ch17-7-1", title: "基础题" }, { id: "ch17-7-2", title: "进阶题" }, { id: "ch17-7-3", title: "开放研究问题" },
      ]},
    ],
  },
];

export const commonMistakes: CommonMistake[] = [
  { id: "m-moravec", pointId: "ch01-1-2", title: "Moravec 悖论的方向混淆",
    wrong: "认为逻辑推理比感知运动控制更难，高估符号 AI 的难度。",
    right: "Moravec 悖论：高级推理对 AI 容易，而感知与运动控制反而极难——这正是具身智能的核心挑战。" },
  { id: "m-so3", pointId: "ch03-2-2", title: "SO(3) 与欧拉角奇异混淆",
    wrong: "用欧拉角表示旋转，忽略万向锁等奇异性问题。",
    right: "SO(3) 李群本身无奇异；应通过李代数 so(3)（旋转向量/反对称矩阵）参数化以避免欧拉角奇异。" },
  { id: "m-cpg", pointId: "ch02-2-1", title: "CPG 需要中央控制",
    wrong: "认为步态节律必须由中央控制器统一产生与协调。",
    right: "CPG 是去中心化的自激振荡网络，通过 Tegotae 反馈实现局部感觉-运动协调，无需中央指令。" },
  { id: "m-kalman", pointId: "ch09-2-1", title: "卡尔曼滤波仅是滤波器",
    wrong: "把卡尔曼滤波仅当作去噪的信号滤波器。",
    right: "它是贝叶斯感觉运动整合的数学语言：融合内部预测（先验）与感觉观测，给出后验状态估计。" },
  { id: "m-lqr", pointId: "ch08-2-3", title: "LQR 适用范围误解",
    wrong: "认为 LQR 只能用于线性系统且需无限时间 horizon。",
    right: "LQR 是局部线性化下的最优反馈控制；非线性/有限 horizon 应使用 iLQR 或 MPC 求解。" },
  { id: "m-ppo", pointId: "ch11-2-5", title: "PPO clip 机制误读",
    wrong: "认为 clip 是为了防止梯度爆炸。",
    right: "clip 限制新旧策略比率范围，约束单步策略更新幅度，避免 KL 散度过大破坏训练稳定。" },
  { id: "m-bc-error", pointId: "ch12-2-2", title: "BC 误差来源误解",
    wrong: "认为行为克隆的误差只来自单步拟合不准确。",
    right: "复合误差：微小单步误差沿轨迹指数放大；DAgger 通过在线纠正分布偏移来缓解。" },
  { id: "m-diffusion", pointId: "ch04-2-1", title: "扩散模型缺乏数学基础",
    wrong: "把扩散模型简单理解为加噪-去噪的经验流程。",
    right: "DDPM 基于马尔可夫链与变分下界；它与 Score-based 模型数学等价，统一于随机微分方程。" },
  { id: "m-grasp", pointId: "ch05-2-3", title: "力封闭与形封闭混淆",
    wrong: "认为力封闭等价于形封闭。",
    right: "形封闭靠几何接触约束完全限制物体运动；力封闭额外利用摩擦力，约束条件更宽松。" },
  { id: "m-rssm", pointId: "ch10-2-2", title: "世界模型=下一帧预测",
    wrong: "认为世界模型只需预测下一帧图像。",
    right: "RSSM 用循环状态空间模型分离确定性与随机潜变量，并通过变分推断学习潜在动态，而非逐帧像素预测。" },
  { id: "m-sim2real", pointId: "ch11-2-7", title: "Sim-to-Real 直接迁移",
    wrong: "认为仿真训练好的策略可直接部署到真实机器人。",
    right: "需通过域随机化、系统辨识与蒸馏缩小 sim-real gap，否则策略在现实中会失效。" },
  { id: "m-vla", pointId: "ch17-2-1", title: "VLA 仅是 LLM 接机器人",
    wrong: "把 VLA 简单理解为把大语言模型接到机器人执行器。",
    right: "VLA 是端到端多模态 Transformer，直接映射视觉-语言到连续动作；π0.5 等还引入空间推理与长程规划。" },
];

export const allPoints: KnowledgePoint[] = chapters.flatMap((c) => c.sections.flatMap((s) => s.points));

const pointMap = new Map(allPoints.map((p) => [p.id, p]));
const chapterMap = new Map(chapters.map((c) => [c.id, c]));
const moduleMap = new Map(modules.map((m) => [m.id, m]));
const mistakeMap = new Map(commonMistakes.map((m) => [m.id, m]));

export function getPoint(id: string): KnowledgePoint | undefined {
  return pointMap.get(id);
}

export function getChapter(id: string): KnowledgeChapter | undefined {
  return chapterMap.get(id);
}

export function getModule(id: string): KnowledgeModule | undefined {
  return moduleMap.get(id);
}

export function getMistake(id: string): CommonMistake | undefined {
  return mistakeMap.get(id);
}

export function getPointChapter(pointId: string): KnowledgeChapter | undefined {
  if (!pointMap.has(pointId)) return undefined;
  for (const c of chapters) {
    if (c.sections.some((s) => s.points.some((p) => p.id === pointId))) return c;
  }
  return undefined;
}

export function getPointSection(pointId: string): KnowledgeSection | undefined {
  for (const c of chapters) {
    for (const s of c.sections) {
      if (s.points.some((p) => p.id === pointId)) return s;
    }
  }
  return undefined;
}

export function getChapterPointCount(chapterId: string): number {
  const c = chapterMap.get(chapterId);
  if (!c) return 0;
  return c.sections.reduce((sum, s) => sum + s.points.length, 0);
}

// === 知识图谱：知识点级关系数据 ===

export type KnowledgeGraphEdgeType = "prerequisite" | "related" | "case";

export interface KnowledgeGraphEdgeData {
  source: string;
  target: string;
  type: KnowledgeGraphEdgeType;
}

export interface KnowledgePointNode {
  point: KnowledgePoint;
  chapter: KnowledgeChapter;
  module: KnowledgeModule;
}

function buildGraphEdges(): KnowledgeGraphEdgeData[] {
  const edges: KnowledgeGraphEdgeData[] = [];
  const prereqPairs = new Set<string>();
  const relatedPairs = new Set<string>();
  const casePairs = new Set<string>();

  for (const p of allPoints) {
    for (const id of p.prerequisites ?? []) {
      if (!pointMap.has(id)) continue;
      edges.push({ source: id, target: p.id, type: "prerequisite" });
      prereqPairs.add([id, p.id].sort().join("\0"));
    }
  }
  for (const p of allPoints) {
    for (const id of p.related ?? []) {
      if (!pointMap.has(id)) continue;
      const pair = [p.id, id].sort().join("\0");
      if (prereqPairs.has(pair) || relatedPairs.has(pair)) continue;
      relatedPairs.add(pair);
      edges.push({ source: p.id, target: id, type: "related" });
    }
  }
  for (const p of allPoints) {
    for (const id of p.cases ?? []) {
      if (!pointMap.has(id)) continue;
      const key = p.id + "\0" + id;
      if (casePairs.has(key)) continue;
      casePairs.add(key);
      edges.push({ source: p.id, target: id, type: "case" });
    }
  }
  return edges;
}

export const graphEdges: KnowledgeGraphEdgeData[] = buildGraphEdges();

export const connectedPointIds: Set<string> = new Set(
  graphEdges.flatMap((e) => [e.source, e.target]),
);

export function getGraphNodes(): KnowledgePointNode[] {
  const result: KnowledgePointNode[] = [];
  for (const id of connectedPointIds) {
    const point = pointMap.get(id);
    const chapter = getPointChapter(id);
    if (!point || !chapter) continue;
    const mod = moduleMap.get(chapter.moduleId);
    if (!mod) continue;
    result.push({ point, chapter, module: mod });
  }
  return result;
}
export const knowledgeStats = {
  chapterCount: chapters.length,
  sectionCount: chapters.reduce((sum, c) => sum + c.sections.length, 0),
  pointCount: allPoints.length,
  mistakeCount: commonMistakes.length,
  moduleCount: modules.length,
  relationCount: allPoints.reduce(
    (sum, p) =>
      sum +
      (p.prerequisites?.length ?? 0) +
      (p.related?.length ?? 0) +
      (p.cases?.length ?? 0) +
      (p.experiments?.length ?? 0),
    0,
  ),
};
