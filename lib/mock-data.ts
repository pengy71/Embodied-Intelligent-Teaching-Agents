// 课程知识体系 Mock 数据

export interface KnowledgeNode {
  id: string;
  name: string;
  chapter: string;
  section: string;
  level: '章节' | '小节' | '知识点' | '关联知识点' | '易错点';
  dependencies: string[];
  mastery: number;
  status: '已掌握' | '学习中' | '未学习';
}

export const courseStructure = {
  chapters: [
    {
      id: 'ch1',
      title: '第一章 环境感知',
      sections: [
        {
          id: 'ch1-s1',
          title: '1.1 传感器基础',
          points: [
            { id: 'kp-1', title: '相机模型与标定', mastery: 85 },
            { id: 'kp-2', title: '激光雷达原理', mastery: 72 },
            { id: 'kp-3', title: 'IMU 与里程计', mastery: 68 },
          ],
        },
        {
          id: 'ch1-s2',
          title: '1.2 多传感器融合',
          points: [
            { id: 'kp-4', title: '卡尔曼滤波', mastery: 55 },
            { id: 'kp-5', title: '点云配准 ICP', mastery: 40 },
          ],
        },
        {
          id: 'ch1-s3',
          title: '1.3 语义感知',
          points: [
            { id: 'kp-6', title: '目标检测 YOLO', mastery: 78 },
            { id: 'kp-7', title: '语义分割', mastery: 60 },
          ],
        },
      ],
    },
    {
      id: 'ch2',
      title: '第二章 世界模型',
      sections: [
        {
          id: 'ch2-s1',
          title: '2.1 世界模型概述',
          points: [
            { id: 'kp-8', title: '世界模型定义与发展', mastery: 65 },
            { id: 'kp-9', title: 'Dreamer 系列模型', mastery: 30 },
          ],
        },
        {
          id: 'ch2-s2',
          title: '2.2 基于大语言模型的世界模型',
          points: [
            { id: 'kp-10', title: 'LLM 作为世界模型', mastery: 25 },
            { id: 'kp-11', title: '具身场景下的世界推理', mastery: 20 },
          ],
        },
      ],
    },
    {
      id: 'ch3',
      title: '第三章 任务规划',
      sections: [
        {
          id: 'ch3-s1',
          title: '3.1 任务分解与层级规划',
          points: [
            { id: 'kp-12', title: 'HTN 层级任务网络', mastery: 50 },
            { id: 'kp-13', title: 'LLM 任务规划', mastery: 45 },
          ],
        },
        {
          id: 'ch3-s2',
          title: '3.2 Motion Planning',
          points: [
            { id: 'kp-14', title: 'RRT 与 PRM', mastery: 35 },
            { id: 'kp-15', title: '轨迹优化', mastery: 28 },
          ],
        },
        {
          id: 'ch3-s3',
          title: '3.3 Manipulation',
          points: [
            { id: 'kp-16', title: '抓取规划', mastery: 22 },
            { id: 'kp-17', title: '力控与柔顺控制', mastery: 15 },
          ],
        },
      ],
    },
    {
      id: 'ch4',
      title: '第四章 多智能体协同',
      sections: [
        {
          id: 'ch4-s1',
          title: '4.1 强化学习基础',
          points: [
            { id: 'kp-18', title: 'MDP 与值函数', mastery: 58 },
            { id: 'kp-19', title: 'PPO 算法', mastery: 42 },
          ],
        },
        {
          id: 'ch4-s2',
          title: '4.2 多智能体强化学习',
          points: [
            { id: 'kp-20', title: 'MARL 框架', mastery: 18 },
            { id: 'kp-21', title: '协作与竞争策略', mastery: 12 },
          ],
        },
      ],
    },
  ],
};

// 知识图谱节点与边
export const graphData = {
  nodes: [
    { id: 'perception', label: '环境感知', group: 0, color: '#3b82f6' },
    { id: 'sensor', label: '传感器基础', group: 1, color: '#60a5fa' },
    { id: 'fusion', label: '多传感器融合', group: 1, color: '#60a5fa' },
    { id: 'semantic', label: '语义感知', group: 1, color: '#60a5fa' },
    { id: 'world_model', label: '世界模型', group: 0, color: '#8b5cf6' },
    { id: 'dreamer', label: 'Dreamer', group: 1, color: '#a78bfa' },
    { id: 'llm_world', label: 'LLM世界模型', group: 1, color: '#a78bfa' },
    { id: 'planning', label: '任务规划', group: 0, color: '#ec4899' },
    { id: 'htn', label: 'HTN', group: 1, color: '#f472b6' },
    { id: 'motion', label: 'Motion Planning', group: 1, color: '#f472b6' },
    { id: 'manipulation', label: 'Manipulation', group: 1, color: '#f472b6' },
    { id: 'marl', label: '多智能体', group: 0, color: '#10b981' },
    { id: 'rl', label: '强化学习', group: 1, color: '#34d399' },
    { id: 'marl_frame', label: 'MARL框架', group: 1, color: '#34d399' },
  ],
  edges: [
    { source: 'perception', target: 'sensor' },
    { source: 'perception', target: 'fusion' },
    { source: 'perception', target: 'semantic' },
    { source: 'world_model', target: 'dreamer' },
    { source: 'world_model', target: 'llm_world' },
    { source: 'planning', target: 'htn' },
    { source: 'planning', target: 'motion' },
    { source: 'planning', target: 'manipulation' },
    { source: 'marl', target: 'rl' },
    { source: 'marl', target: 'marl_frame' },
    { source: 'sensor', target: 'fusion' },
    { source: 'fusion', target: 'world_model' },
    { source: 'semantic', target: 'world_model' },
    { source: 'world_model', target: 'planning' },
    { source: 'planning', target: 'marl' },
    { source: 'rl', target: 'marl_frame' },
  ],
};

// 学生学习数据
export const studentStats = {
  totalStudents: 128,
  activeToday: 96,
  averageProgress: 62,
  averageMastery: 58,
  weakPoints: ['Manipulation 抓取规划', 'MARL 协作策略', '轨迹优化', 'Dreamer 模型'],
  hotQuestions: [
    { topic: '卡尔曼滤波与扩展卡尔曼滤波的区别', count: 47 },
    { topic: 'RRT算法的采样策略如何选择', count: 38 },
    { topic: 'PPO中clip机制的作用', count: 35 },
    { topic: '世界模型在具身智能中的作用', count: 31 },
    { topic: '多传感器融合的时间同步问题', count: 28 },
  ],
  testDistribution: {
    excellent: 18,
    good: 42,
    pass: 48,
    fail: 20,
  },
  warningStudents: [
    { name: '张明', id: '2024001', progress: 25, reason: '连续7天未学习' },
    { name: '李华', id: '2024002', progress: 35, reason: '练习正确率低于40%' },
    { name: '王芳', id: '2024003', progress: 28, reason: '第三章未开始' },
    { name: '赵强', id: '2024004', progress: 32, reason: '连续7天未学习' },
  ],
};

// 学习路径数据
export const learningPath = {
  overallProgress: 57,
  estimatedDaysLeft: 42,
  estimatedCompletion: '2026-09-06',
  currentPhase: '第三章 任务规划',
  phases: [
    {
      id: 'phase-1',
      title: '第一章 环境感知',
      status: 'completed' as const,
      progress: 100,
      completedDate: '2026-07-10',
      estimatedDays: 14,
      actualDays: 12,
      nodes: [
        { name: '1.1 传感器基础', mastery: 85, status: 'completed' as const },
        { name: '1.2 多传感器融合', mastery: 72, status: 'completed' as const },
        { name: '1.3 语义感知', mastery: 78, status: 'completed' as const },
      ],
    },
    {
      id: 'phase-2',
      title: '第二章 世界模型',
      status: 'completed' as const,
      progress: 100,
      completedDate: '2026-07-20',
      estimatedDays: 10,
      actualDays: 11,
      nodes: [
        { name: '2.1 世界模型概述', mastery: 65, status: 'completed' as const },
        { name: '2.2 基于LLM的世界模型', mastery: 48, status: 'completed' as const },
      ],
    },
    {
      id: 'phase-3',
      title: '第三章 任务规划',
      status: 'in_progress' as const,
      progress: 38,
      estimatedDays: 16,
      actualDays: 7,
      nodes: [
        { name: '3.1 任务分解与层级规划', mastery: 50, status: 'in_progress' as const },
        { name: '3.2 Motion Planning', mastery: 35, status: 'learning' as const },
        { name: '3.3 Manipulation', mastery: 22, status: 'not_started' as const },
      ],
    },
    {
      id: 'phase-4',
      title: '第四章 多智能体协同',
      status: 'not_started' as const,
      progress: 0,
      estimatedDays: 14,
      actualDays: 0,
      nodes: [
        { name: '4.1 强化学习基础', mastery: 18, status: 'not_started' as const },
        { name: '4.2 多智能体强化学习', mastery: 12, status: 'not_started' as const },
      ],
    },
  ],
  milestones: [
    { title: '完成环境感知模块', date: '2026-07-10', achieved: true },
    { title: '完成世界模型模块', date: '2026-07-20', achieved: true },
    { title: '完成任务规划模块', date: '预计 2026-08-15', achieved: false },
    { title: '完成多智能体协同模块', date: '预计 2026-09-06', achieved: false },
    { title: '课程全部完成', date: '预计 2026-09-06', achieved: false },
  ],
};

// 个人学习数据（学生端）
export const personalStats = {
  studyDays: 23,
  totalHours: 47.5,
  currentStreak: 5,
  masteredPoints: 12,
  totalPoints: 21,
  weakPoints: ['Dreamer 系列模型', 'RRT 与 PRM', '抓取规划', 'MARL 框架'],
  todayPlan: [
    {
      id: 1,
      title: '复习：卡尔曼滤波',
      type: '巩固',
      chapter: '第一章 1.2',
      estimated: '20分钟',
      done: true,
    },
    {
      id: 2,
      title: '学习：HTN 层级任务网络',
      type: '新知',
      chapter: '第三章 3.1',
      estimated: '35分钟',
      done: false,
    },
    {
      id: 3,
      title: '练习：Motion Planning 专项',
      type: '练习',
      chapter: '第三章 3.2',
      estimated: '25分钟',
      done: false,
    },
  ],
  recentQA: [
    {
      id: 1,
      question: '什么是齐次变换矩阵？',
      time: '2小时前',
      preview: '齐次变换矩阵是机器人学中描述刚体位姿的4×4矩阵...',
      source: '教材 P.45',
    },
    {
      id: 2,
      question: 'RRT算法为什么是概率完备的？',
      time: '昨天',
      preview: 'RRT通过在状态空间中随机采样并扩展搜索树...',
      source: '教材 P.128',
    },
    {
      id: 3,
      question: 'PPO和TRPO的主要区别是什么？',
      time: '3天前',
      preview: 'PPO使用截断目标函数替代TRPO的KL约束...',
      source: '教材 P.215',
    },
  ],
};

// 课程资料
export const courseMaterials = [
  {
    id: 1,
    name: '具身智能导论.pdf',
    type: '教材',
    size: '12.5 MB',
    date: '2024-09-01',
    pages: 280,
  },
  {
    id: 2,
    name: '第一章 环境感知.pptx',
    type: '课件',
    size: '8.2 MB',
    date: '2024-09-05',
    pages: 45,
  },
  {
    id: 3,
    name: '第二章 世界模型.pptx',
    type: '课件',
    size: '6.8 MB',
    date: '2024-09-12',
    pages: 38,
  },
  {
    id: 4,
    name: 'ROS2 机器人实验手册.pdf',
    type: '实验文档',
    size: '3.4 MB',
    date: '2024-09-15',
    pages: 62,
  },
  {
    id: 5,
    name: 'Dreamer V3 论文.pdf',
    type: '论文',
    size: '5.1 MB',
    date: '2024-09-18',
    pages: 22,
  },
  {
    id: 6,
    name: '第三章 任务规划.pptx',
    type: '课件',
    size: '7.5 MB',
    date: '2024-09-20',
    pages: 41,
  },
  {
    id: 7,
    name: 'MoveIt 运动规划实验.pdf',
    type: '实验文档',
    size: '2.8 MB',
    date: '2024-09-22',
    pages: 35,
  },
  {
    id: 8,
    name: '第四章 多智能体协同.pptx',
    type: '课件',
    size: '9.1 MB',
    date: '2024-09-25',
    pages: 52,
  },
];

// 练习题
export const practiceQuestions = [
  {
    id: 1,
    type: '单选',
    difficulty: '中等',
    chapter: '第一章 环境感知',
    question: '在相机标定中，张正友标定法主要利用什么平面来求解相机内参？',
    options: ['棋盘格平面', '任意平面', '球面', '圆柱面'],
    answer: 0,
    explanation:
      '张正友标定法通过在不同角度拍摄棋盘格平面，建立平面与图像之间的单应矩阵来求解内参。',
  },
  {
    id: 2,
    type: '单选',
    difficulty: '较难',
    chapter: '第三章 任务规划',
    question: 'RRT算法中，新节点是通过什么方式生成的？',
    options: [
      '随机采样后朝采样点方向扩展固定步长',
      '在所有节点中随机选择并连接',
      '沿着梯度方向扩展',
      '使用贪心算法选择最优方向',
    ],
    answer: 0,
    explanation:
      'RRT每次随机采样一个目标点，找到树中距离最近的节点，朝目标点方向扩展一个固定步长生成新节点。',
  },
  {
    id: 3,
    type: '多选',
    difficulty: '中等',
    chapter: '第四章 多智能体协同',
    question: '以下哪些是强化学习中值函数估计的方法？',
    options: ['Monte Carlo', '时序差分(TD)', '梯度下降', '动态规划'],
    answer: [0, 1, 3],
    explanation: '值函数估计方法包括Monte Carlo、TD学习和动态规划，构成了强化学习的三大基石。',
  },
];

// 错题集
export const wrongQuestions = [
  {
    id: 1,
    chapter: '第一章 1.2',
    question: '扩展卡尔曼滤波(EKF)相比标准卡尔曼滤波的主要改进是？',
    yourAnswer: '使用线性化处理非线性系统',
    correctAnswer: '通过一阶泰勒展开对非线性函数进行线性化',
    wrongReason: '概念理解不完整',
    date: '2024-10-15',
  },
  {
    id: 2,
    chapter: '第三章 3.2',
    question: 'PRM(概率路线图)与RRT的主要区别是？',
    yourAnswer: 'PRM是单次查询，RRT是多次查询',
    correctAnswer: 'PRM是多查询方法先建图，RRT是单查询方法每次重新规划',
    wrongReason: '查询模式混淆',
    date: '2024-10-14',
  },
  {
    id: 3,
    chapter: '第四章 4.1',
    question: 'PPO算法中clip机制的作用是什么？',
    yourAnswer: '防止梯度爆炸',
    correctAnswer: '限制策略更新幅度，避免新旧策略差异过大',
    wrongReason: '核心概念理解偏差',
    date: '2024-10-12',
  },
];

// AI教师模板
export const aiTemplates = [
  {
    id: 'academic',
    name: '学术严谨型',
    icon: 'GraduationCap',
    description: '注重理论推导、强调专业术语、精炼讲解',
    suitable: '基础较好、理解能力较强的学生',
    traits: { depth: '深入', style: '理论推导', pace: '标准' },
  },
  {
    id: 'inspiring',
    name: '引导启发型',
    icon: 'Lightbulb',
    description: '问题驱动教学、引导逐步推理、培养独立分析能力',
    suitable: '具有一定基础，希望通过思考完成学习的学生',
    traits: { depth: '标准', style: '提问引导', pace: '循序渐进' },
  },
  {
    id: 'accessible',
    name: '通俗易懂型',
    icon: 'MessageCircle',
    description: '大量生活化案例、比喻类比、分步骤讲解',
    suitable: '基础较弱或初学者',
    traits: { depth: '基础', style: '案例类比', pace: '循序渐进' },
  },
  {
    id: 'practical',
    name: '实践应用型',
    icon: 'Wrench',
    description: '强调实验与案例、结合机器人应用、提供代码示例',
    suitable: '更关注工程实践的学生',
    traits: { depth: '标准', style: '实验优先', pace: '标准' },
  },
];
