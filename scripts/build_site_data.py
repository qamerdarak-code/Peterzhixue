import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_IN = ROOT / "extracted" / "questions.unique.json"
OUT = ROOT / "public" / "questions.js"
STATISTICS_DOCX_TEXT = ROOT / "extracted" / "medical-statistics-docx.txt"
STATISTICS_EXTRA_QUESTIONS = ROOT / "extracted" / "statistics-extra-questions.json"
PARASITOLOGY_DOC = ROOT / "extracted" / "parasitology-choices.doc"
XIGAI_DOC = ROOT / "extracted" / "xigai-choices.doc"
PATHOLOGY_DOC = ROOT / "extracted" / "pathology-slides.doc"


TOPICS = [
    {
        "name": "医学心理学绪论",
        "keys": ["医学心理学", "研究任务", "分支", "研究方法", "临床心理学之父", "科学心理学"],
        "note": "重点掌握医学心理学的定义、研究任务、分支学科和常用研究方法。它强调心理社会因素在健康、疾病及转归中的作用。",
    },
    {
        "name": "医学模式",
        "keys": ["医学模式", "生物-心理-社会", "恩格尔", "疾病谱"],
        "note": "医学模式是对健康与疾病的总体认识。现代医学主导模式为生物-心理-社会医学模式，由恩格尔提出。",
    },
    {
        "name": "心理实质与心理现象",
        "keys": ["心理的实质", "心理现象", "脑的功能", "客观现实", "心理过程", "人格"],
        "note": "心理是脑的功能，是客观现实在人脑中的主观能动反映；心理现象通常包括心理过程和人格。",
    },
    {
        "name": "感觉、知觉与认知",
        "keys": ["感觉", "知觉", "恒常性", "选择性", "整体性", "理解性", "后像", "联觉", "适应", "认知"],
        "note": "感觉反映个别属性，知觉反映整体属性。知觉常考选择性、整体性、理解性、恒常性等特征。",
    },
    {
        "name": "记忆、思维与学习",
        "keys": ["记忆", "思维", "迁移", "功能固着", "创造", "遗忘", "短时记忆", "瞬时记忆"],
        "note": "记忆过程包括识记、保持、再认和回忆；思维具有间接性和概括性，迁移会影响问题解决。",
    },
    {
        "name": "情绪、意志与需要",
        "keys": ["情绪", "意志", "马斯洛", "需要", "心境", "沙赫特", "三因素"],
        "note": "沙赫特三因素学说强调情景、认知和生理变化共同形成情绪；马斯洛需要层次常用于解释动机。",
    },
    {
        "name": "人格、气质与行为类型",
        "keys": ["人格", "气质", "性格", "A型", "B型", "C型", "D型", "胆汁质", "多血质", "粘液质", "抑郁质"],
        "note": "人格包括较稳定的心理特征。A型行为与冠心病风险相关，C型行为与癌症易感性常被联系考查。",
    },
    {
        "name": "心理应激与心身疾病",
        "keys": ["应激", "心身", "社会支持", "应对", "生活事件", "冠心病", "糖尿病", "癌"],
        "note": "应激涉及应激源、认知评价、应对方式和社会支持。心理社会因素可影响心身疾病发生发展。",
    },
    {
        "name": "心理评估与测验",
        "keys": ["心理测验", "测验", "信度", "效度", "常模", "投射", "主题统觉", "明尼苏达", "艾森克", "卡特尔", "量表", "MMPI", "TAT", "SCL-90", "SAS", "SDS", "HAMD", "智商", "比率智商", "标准化"],
        "note": "标准化心理测验要求标准程序、常模、信度和效度。信度看稳定可靠，效度看测得是否为目标特质。",
    },
    {
        "name": "心理咨询与心理治疗",
        "keys": ["心理咨询", "心理治疗", "行为疗法", "认知疗法", "精神分析", "来访者中心", "厌恶疗法", "放松训练", "自由联想"],
        "note": "行为疗法重在矫正不良行为，认知疗法重在改变负性自动想法，精神分析强调潜意识冲突。",
    },
    {
        "name": "患者心理与医患沟通",
        "keys": ["病人", "患者", "医患", "角色", "沟通", "共同参与", "指导-合作", "主动-被动", "同情", "倾听"],
        "note": "医患沟通强调尊重、倾听、共情和信息充分。医患关系模式需结合疾病状态和患者参与能力判断。",
    },
]


def infer_topic(q):
    haystack = q["stem"] + " " + " ".join(q["options"].values())
    scores = []
    for topic in TOPICS:
        score = sum(1 for key in topic["keys"] if key in haystack)
        if score:
            scores.append((score, topic))
    return max(scores, key=lambda item: item[0])[1] if scores else TOPICS[0]


def normalize_space(value):
    return re.sub(r"\s+", " ", value).strip()


def normalize_key(value):
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", value).lower()


LATEST_SOURCE = "最新校对：fe46c07f2ff0198706586d8544a653ed_709085484549473150_m.zip"


LATEST_CORRECTIONS = {
    normalize_key("情绪和情感所反映的是"): {
        "answer": "E",
        "source": "医学心理学试题1.pptx / 医学心理学试题11.pptx",
    },
    normalize_key("关于HAMD的描述， 正确 的是"): {
        "answer": "E",
        "options": {
            "E": "分数越高，抑郁水平越高",
        },
        "source": "医学心理学试题11.pptx",
    },
    normalize_key("心理应激概念的核心是"): {
        "answer": "A",
        "source": "医学心理题2.pptx",
    },
    normalize_key("男孩，9岁，孤独症患者。心理治疗师在对其进行治疗的过程中，每当了解到他有主动向老师问好、递给小朋友玩具或整理好自己的衣服等情形时，就奖励他一个纸质小星星作为强化物。该心理治疗师采用的行为治疗技术是"): {
        "answer": "B",
        "source": "试题3.pptx",
    },
    normalize_key("不属于行为疗法的心理治疗方法为"): {
        "answer": "D",
        "source": "用户最终校正，2026-06-02",
        "explanation": "答案为 D：暗示疗法。系统脱敏、厌恶疗法、代币法和模仿学习均属于常见行为疗法技术；暗示疗法不属于行为疗法。",
    },
    normalize_key("以下属于 投射测验的是"): {
        "answer": "B",
        "options": {
            "E": "精神症状自评量表",
        },
        "source": "医学心理学试题11.pptx",
    },
    normalize_key("影响 心理测验的信度是 （）"): {
        "answer": "A",
        "options": {
            "E": "以上都不对",
        },
        "source": "医学心理学试题11.pptx",
    },
    normalize_key("比率智商 适用于"): {
        "answer": "A",
        "options": {
            "E": "任何年龄",
        },
        "source": "医学心理学试题11.pptx",
    },
}


LATEST_ORIGINALS = [
    {
        "source": "原题（老师配套习题）",
        "sourceFile": f"{LATEST_SOURCE}；医学心理学试题1.pptx",
        "number": 3,
        "type": "single",
        "stem": "“础润而雨”是思维的（ ）特点",
        "options": {
            "A": "本质性",
            "B": "外部特征",
            "C": "间接性",
            "D": "没关系",
            "E": "抽象性",
        },
        "answer": "C",
        "explanation": "",
        "knowledge": [],
    },
    {
        "source": "原题（老师配套习题）",
        "sourceFile": f"{LATEST_SOURCE}；医学心理学试题1.pptx",
        "number": 6,
        "type": "single",
        "stem": "性格（ ）",
        "options": {
            "A": "无好坏之分",
            "B": "人格形成的社会基础",
            "C": "没有明显的社会道德评价意义",
            "D": "不受环境影响而发生变化",
            "E": "“冷静”描述的是个体的性格",
        },
        "answer": "B",
        "explanation": "",
        "knowledge": [],
    },
    {
        "source": "原题（老师配套习题）",
        "sourceFile": f"{LATEST_SOURCE}；医学心理学试题11.pptx",
        "number": 6,
        "type": "single",
        "stem": "有关气质的描述错误的是",
        "options": {
            "A": "“冷静”描述的是气质",
            "B": "人格形成的生物基础",
            "C": "没有明显的社会道德评价意义",
            "D": "不受环境影响而发生变化",
            "E": "“冲动”描述的是个体的性格",
        },
        "answer": "E",
        "explanation": "",
        "knowledge": [],
    },
    {
        "source": "原题（老师配套习题）",
        "sourceFile": f"{LATEST_SOURCE}；医学心理学试题11.pptx",
        "number": 9,
        "type": "single",
        "stem": "男，37岁。因有明显的幻觉及妄想表现而到医院就诊。经询问病情后，医生欲采用心理测验对其进行评估，以协助诊断。针对该精神障碍患者，通常可采用的心理测验工具为",
        "options": {
            "A": "EPQ",
            "B": "MMPI",
            "C": "SAS",
            "D": "SCL-90",
            "E": "TAT",
        },
        "answer": "B",
        "explanation": "答案为 B：MMPI。该题按用户 2026-06-02 最终校正处理；精神障碍评估中常用明尼苏达多项人格测验辅助判断人格及精神病理特征。",
        "knowledge": ["心理评估与测验"],
    },
]


def enrich_original(q):
    answer = q.get("answer", "")
    custom_explanation = q.get("explanation", "")
    answer_text = q["options"].get(answer, "") if answer else ""
    q["stem"] = normalize_space(q["stem"])
    q["options"] = {key: normalize_space(value) for key, value in q["options"].items()}
    correction = LATEST_CORRECTIONS.get(normalize_key(q["stem"]))
    if correction:
        if "options" in correction:
            q["options"].update(correction["options"])
        q["answer"] = correction["answer"]
        answer = q["answer"]
        answer_text = q["options"].get(answer, "")
        if LATEST_SOURCE not in q.get("sourceFile", ""):
            q["sourceFile"] = f"{q.get('sourceFile', '')}；{LATEST_SOURCE}；{correction['source']}".strip("；")
    if q.get("number") == 154 and q["stem"] == "共用备选答案":
        q["stem"] = "共用备选答案：依次判断“认知疗法基本技术 / 行为治疗基本技术 / 来访者中心治疗基本技术”"
        q["options"]["E"] = "控制个人利益"
        answer_text = "B / A / D"
    elif q.get("number") == 155 and q["stem"] == "共用备选答案":
        q["stem"] = "共用备选答案：依次判断“食之无味，弃之可惜 / 鱼和熊掌不可兼得 / 前怕狼后怕虎”"
        answer_text = "C / B / A"
    elif q.get("number") == 156 and q["stem"] == "共用备选答案":
        q["stem"] = "共用备选答案：依次判断“弗洛伊德 / 埃里克森 / 艾森克”提出的人格理论"
        answer_text = "A / E / C"
    topic = infer_topic(q)
    q["knowledge"] = [topic["name"]]
    if correction and correction.get("explanation"):
        q["explanation"] = correction["explanation"]
    elif custom_explanation:
        q["explanation"] = custom_explanation
    elif answer and answer_text:
        q["explanation"] = f"答案为 {answer}：{answer_text}。考点：{topic['name']}。{topic['note']}"
    elif answer:
        q["explanation"] = f"答案为 {answer}。考点：{topic['name']}。{topic['note']}"
    else:
        q["explanation"] = "该题源文件未给出可稳定抽取的答案，已标记为待核验；建议复习时先对照老师原资料确认。"
    return q


EXTENDED = [
    {
        "stem": "下列关于医学心理学课程定位的说法，最符合本课程重点的是",
        "options": {
            "A": "只研究精神疾病的诊断标准",
            "B": "将心理学理论与技术应用于医学领域，研究心理社会因素与健康疾病的关系",
            "C": "主要研究医院财务管理制度",
            "D": "只讨论药物对神经递质的影响",
            "E": "等同于普通心理咨询学",
        },
        "answer": "B",
        "knowledge": ["医学心理学绪论"],
        "explanation": "医学心理学是医学与心理学相结合的学科，重点在心理社会因素对健康、疾病及相互转化过程的作用规律。",
    },
    {
        "stem": "某同学把“生物因素、个体认知、家庭支持、社会压力”一起用于分析慢性病患者的康复，这体现的医学模式是",
        "options": {
            "A": "神灵主义医学模式",
            "B": "自然哲学医学模式",
            "C": "生物医学模式",
            "D": "生物-心理-社会医学模式",
            "E": "机械论医学模式",
        },
        "answer": "D",
        "knowledge": ["医学模式"],
        "explanation": "生物-心理-社会医学模式强调疾病与健康受生物、心理、社会多维因素共同影响，是现代医学主导模式。",
    },
    {
        "stem": "“白纸在橙色灯光下仍被看成白色”最能说明知觉具有",
        "options": {"A": "选择性", "B": "恒常性", "C": "情绪性", "D": "投射性", "E": "暗示性"},
        "answer": "B",
        "knowledge": ["感觉、知觉与认知"],
        "explanation": "知觉恒常性是指客观条件变化时，人对熟悉对象的知觉仍保持相对稳定。",
    },
    {
        "stem": "学生做题时受之前相似题型影响，更快找到解法，这种现象最接近",
        "options": {"A": "迁移", "B": "后像", "C": "遗忘", "D": "情绪感染", "E": "角色冲突"},
        "answer": "A",
        "knowledge": ["记忆、思维与学习"],
        "explanation": "迁移指已有知识、技能或方法对解决新问题产生影响，既可能促进，也可能干扰。",
    },
    {
        "stem": "按照沙赫特情绪三因素学说，情绪产生必须综合考虑",
        "options": {
            "A": "情景、认知、生理变化",
            "B": "遗传、气质、性格",
            "C": "感觉、知觉、记忆",
            "D": "需要、动机、行为",
            "E": "暗示、模仿、强化",
        },
        "answer": "A",
        "knowledge": ["情绪、意志与需要"],
        "explanation": "沙赫特认为情绪由情景刺激、生理唤醒和认知评价共同作用形成，是情绪理论常考点。",
    },
    {
        "stem": "竞争心强、时间紧迫感明显、易急躁好胜的学生，其行为类型最符合",
        "options": {"A": "A型行为", "B": "B型行为", "C": "C型行为", "D": "D型行为", "E": "E型行为"},
        "answer": "A",
        "knowledge": ["人格、气质与行为类型"],
        "explanation": "A型行为常表现为时间紧迫、竞争性强、急躁和好胜，资料中提示其与冠心病等风险有关。",
    },
    {
        "stem": "某患者长期压抑愤怒、过分顺从、回避表达负性情绪，按行为类型与疾病易感性的课堂重点，更接近",
        "options": {"A": "A型行为", "B": "B型行为", "C": "C型行为", "D": "D型行为", "E": "AB混合型行为"},
        "answer": "C",
        "knowledge": ["人格、气质与行为类型"],
        "explanation": "C型行为常与压抑情绪、过分忍让等特征相联系，课堂重点中常与癌症易感性对应。",
    },
    {
        "stem": "应激状态下，个体主动搜集信息、制定行动计划并寻求社会支持，这属于",
        "options": {
            "A": "问题集中性应对",
            "B": "情绪集中性应对",
            "C": "退缩性反应",
            "D": "否认反应",
            "E": "幻想性应对",
        },
        "answer": "A",
        "knowledge": ["心理应激与心身疾病"],
        "explanation": "问题集中性应对强调直接处理问题，如获取信息、行动规划、自我调节和寻求社会支持。",
    },
    {
        "stem": "评价一个心理测验是否真正测到了想测的心理特质，主要看",
        "options": {"A": "常模", "B": "效度", "C": "速度", "D": "题量", "E": "施测地点"},
        "answer": "B",
        "knowledge": ["心理评估与测验"],
        "explanation": "效度指测验能够测量其目标心理特质的程度；信度则偏重测验结果的稳定性和可靠性。",
    },
    {
        "stem": "让来访者围绕浮现的想法自由表达，以探索潜意识冲突，属于哪类治疗的常用技术",
        "options": {"A": "行为治疗", "B": "认知治疗", "C": "精神分析治疗", "D": "森田疗法", "E": "满灌疗法"},
        "answer": "C",
        "knowledge": ["心理咨询与心理治疗"],
        "explanation": "自由联想是精神分析治疗的典型技术，用于探索潜意识内容及内在冲突。",
    },
    {
        "stem": "认知治疗最关注的治疗切入点通常是",
        "options": {
            "A": "改变不合理信念和负性自动想法",
            "B": "直接增加药物剂量",
            "C": "完全避免所有社会接触",
            "D": "取消患者的自主表达",
            "E": "只训练肌肉力量",
        },
        "answer": "A",
        "knowledge": ["心理咨询与心理治疗"],
        "explanation": "认知治疗强调识别并修正不合理信念、负性自动想法和错误思维方式。",
    },
    {
        "stem": "医生面对术前焦虑患者，最适合促进其表达内心担忧的问法是",
        "options": {"A": "你不用害怕", "B": "这没什么问题", "C": "你担心什么", "D": "必须坚强", "E": "不要再想了"},
        "answer": "C",
        "knowledge": ["患者心理与医患沟通"],
        "explanation": "开放式提问能给患者表达内心体验的空间，更符合尊重、倾听、共情的医患沟通原则。",
    },
]


STATISTICS_TOPICS = [
    {
        "name": "医学统计学绪论",
        "note": "重点掌握医学统计学的研究对象、总体与样本、随机事件、概率分布、统计描述以及常见误差类型。",
    },
    {
        "name": "总体、样本与抽样误差",
        "note": "总体是同质观察单位的全体，样本是总体中有代表性的一部分观察单位；抽样误差来自样本统计量与总体参数之间的差异。",
    },
    {
        "name": "误差类型",
        "note": "随机误差由不可预知的偶然因素引起，系统误差由固定因素引起，过失误差多与操作或记录失误有关。",
    },
    {
        "name": "概率与统计描述",
        "note": "概率用于描述随机事件发生的可能性；统计描述常通过统计指标、统计表和统计图表达数据特征。",
    },
    {
        "name": "定量数据的统计描述",
        "note": "重点掌握均数、中位数、几何均数、百分位数、标准差、方差、四分位数间距和变异系数的适用条件。",
    },
    {
        "name": "正态分布与医学参考值范围",
        "note": "重点掌握正态分布的位置参数与形状参数、标准正态变换、参考值范围含义及单侧或双侧范围的选择。",
    },
    {
        "name": "定性数据的统计描述",
        "note": "重点掌握相对数、率、构成比、相对比、标准化率的适用条件和常见误用。",
    },
    {
        "name": "统计表与统计图",
        "note": "重点掌握统计表结构和线图、条图、直方图、百分条图、箱式图、散点图等统计图的适用场景。",
    },
    {
        "name": "参数估计与假设检验",
        "note": "重点掌握标准误、置信区间、假设检验、I 类错误、II 类错误、检验效能和单双侧检验。",
    },
    {
        "name": "t 检验",
        "note": "重点掌握配对 t 检验、两独立样本 t 检验、正态性和方差齐性条件、自由度及 P 值判断。",
    },
    {
        "name": "方差分析",
        "note": "重点掌握方差分析基本思想、总变异分解、F 检验、多个均数比较和随机区组设计。",
    },
    {
        "name": "χ² 检验",
        "note": "重点掌握四格表、配对四格表、行列表、Fisher 确切概率法和多重比较的 χ² 检验适用条件。",
    },
    {
        "name": "非参数秩和检验",
        "note": "重点掌握秩和检验适用场景、Wilcoxon 检验、Kruskal-Wallis H 检验和参数检验的关系。",
    },
    {
        "name": "线性回归与相关",
        "note": "重点掌握 Pearson 相关、直线回归、回归系数、决定系数、最小二乘法及回归与相关的关系。",
    },
]


STATISTICS_UNIT2 = [
    {
        "stem": "某医学资料数据大小一端没有确定数值，描述其集中趋势适用的统计指标是",
        "options": {"A": "中位数", "B": "几何均数", "C": "均数", "D": "P95", "E": "频数分布"},
        "answer": "A",
    },
    {
        "stem": "算术均数与中位数相比，其特点是",
        "options": {
            "A": "不易受极端值的影响",
            "B": "能充分利用数据的信息",
            "C": "抽样误差较大",
            "D": "更适用于偏态分布资料",
            "E": "更适用于分布不明资料",
        },
        "answer": "B",
    },
    {
        "stem": "将一组定量资料整理成频数表的主要目的是",
        "options": {
            "A": "化为计数资料",
            "B": "便于计算",
            "C": "提供原始数据",
            "D": "能够更精确地检验",
            "E": "描述数据的分布特征",
        },
        "answer": "E",
    },
    {
        "stem": "6人接种流行性脑脊髓膜炎疫苗一个月后测定抗体滴度为1:20、1:40、1:80、1:80、1:160、1:320，求平均滴度应选用的指标是",
        "options": {"A": "均数", "B": "几何均数", "C": "中位数", "D": "百分位数", "E": "倒数的均数"},
        "answer": "B",
    },
    {
        "stem": "变异系数主要用于",
        "options": {
            "A": "比较不同计量指标的变异程度",
            "B": "衡量正态分布的变异程度",
            "C": "衡量测量的准确度",
            "D": "衡量偏态分布的变异程度",
            "E": "衡量样本抽样误差的大小",
        },
        "answer": "A",
    },
    {
        "stem": "对于正态或近似正态分布的资料，描述其变异程度应选用的指标是",
        "options": {"A": "变异系数", "B": "离均差平方和", "C": "极差", "D": "四分位数间距", "E": "标准差"},
        "answer": "E",
    },
    {
        "stem": "已知动脉硬化患者血清载脂蛋白B的含量呈明显偏态分布，描述其个体差异的统计指标应选用",
        "options": {"A": "全距", "B": "标准差", "C": "变异系数", "D": "方差", "E": "四分位数间距"},
        "answer": "E",
    },
    {
        "stem": "一组原始数据的分布呈正偏态分布，其数据的特点是",
        "options": {
            "A": "数值离散度大",
            "B": "数值离散度小",
            "C": "数值偏向较大的方向",
            "D": "数值偏向较小的方向",
            "E": "数值分布不均匀",
        },
        "answer": "D",
    },
    {
        "stem": "对于正偏态分布资料，其均数与中位数的关系是",
        "options": {
            "A": "均数与中位数相同",
            "B": "均数大于中位数",
            "C": "均数小于中位数",
            "D": "两者有一定的数量关系",
            "E": "两者的数量关系不定",
        },
        "answer": "B",
    },
    {
        "stem": "在衡量数据的变异度时，标准差与方差相比，其主要特点是",
        "options": {
            "A": "标准差小于方差",
            "B": "标准差大于方差",
            "C": "标准差更容易计算",
            "D": "标准差更为准确",
            "E": "标准差的计量单位与原始数据相同",
        },
        "answer": "E",
    },
    {
        "stem": "一组数据改变计量单位后，其相应的标准差",
        "options": {"A": "变大", "B": "变小", "C": "不改变", "D": "变大或变小", "E": "等于之前的标准差加上一个常数"},
        "answer": "D",
    },
    {
        "stem": "欲比较某地成年男性舒张压和收缩压的变异程度，应采用的指标是",
        "options": {"A": "标准差", "B": "方差", "C": "极差", "D": "四分位数间距", "E": "变异系数"},
        "answer": "E",
    },
    {
        "stem": "比较健康人群血肌酐和尿素氮的变异程度，应采用的指标是",
        "options": {"A": "标准差", "B": "百分位数", "C": "极差", "D": "四分位数间距", "E": "变异系数"},
        "answer": "E",
    },
    {
        "stem": "中位数与算术均数相比，其特点是",
        "options": {
            "A": "容易计算",
            "B": "计算出的结果更为可靠",
            "C": "不易受异常值影响",
            "D": "更适合对称分布的数据",
            "E": "由样本数据计算出的结果稳定",
        },
        "answer": "C",
    },
    {
        "stem": "应用百分位数P95，需要的条件是",
        "options": {"A": "数据服从正态分布", "B": "数据的变异较小", "C": "不能有异常值", "D": "数据的变异较大", "E": "随机样本"},
        "answer": "E",
    },
]


def infer_statistics_topic(stem):
    if any(key in stem for key in ["均数", "中位数", "几何均数", "百分位数", "标准差", "方差", "四分位数", "变异系数", "正偏态", "偏态", "频数表", "变异程度", "全距", "极差"]):
        return STATISTICS_TOPICS[4]["name"]
    if any(key in stem for key in ["误差", "测量"]):
        return STATISTICS_TOPICS[2]["name"]
    if any(key in stem for key in ["总体", "样本", "抽样"]):
        return STATISTICS_TOPICS[1]["name"]
    if any(key in stem for key in ["概率", "统计描述", "统计图", "统计表"]):
        return STATISTICS_TOPICS[3]["name"]
    return STATISTICS_TOPICS[0]["name"]


def parse_statistics_questions():
    if not STATISTICS_DOCX_TEXT.exists():
        return []
    lines = [line.strip() for line in STATISTICS_DOCX_TEXT.read_text(encoding="utf-8").splitlines() if line.strip()]
    questions = []
    current = None
    option_re = re.compile(r"^([A-E])[.．、]\s*(.+)$")
    stem_re = re.compile(r"^(?:[\uf0b7]\s*)?(?:(\d+)[.．、]\s*)?(.+?)（([A-E])）$")
    for line in lines:
        stem_match = stem_re.match(line)
        option_match = option_re.match(line)
        if stem_match:
            if current and len(current["options"]) >= 4:
                questions.append(current)
            number = int(stem_match.group(1) or len(questions) + 1)
            stem = normalize_space(stem_match.group(2))
            answer = stem_match.group(3)
            topic = infer_statistics_topic(stem)
            current = {
                "id": "",
                "source": "原题（老师配套习题）",
                "sourceFile": "医学统计学选择题部分.docx",
                "number": number,
                "type": "single",
                "stem": stem,
                "options": {},
                "answer": answer,
                "explanation": "",
                "knowledge": [topic],
            }
        elif current and option_match:
            current["options"][option_match.group(1)] = normalize_space(option_match.group(2))
    if current and len(current["options"]) >= 4:
        questions.append(current)

    for item in STATISTICS_UNIT2:
        topic = infer_statistics_topic(item["stem"])
        questions.append(
            {
                "id": "",
                "source": "原题（老师配套习题）",
                "sourceFile": "用户截图：第二章 定量数据的统计描述",
                "number": len(questions) + 1,
                "type": "single",
                "stem": item["stem"],
                "options": item["options"],
                "answer": item["answer"],
                "explanation": "",
                "knowledge": [topic],
            }
        )

    if STATISTICS_EXTRA_QUESTIONS.exists():
        extra_questions = json.loads(STATISTICS_EXTRA_QUESTIONS.read_text(encoding="utf-8"))
        for item in extra_questions:
            topic = item.get("topic") or item.get("knowledge", [STATISTICS_TOPICS[0]["name"]])[0]
            questions.append(
                {
                    "id": "",
                    "source": "原题（老师配套习题）",
                    "sourceFile": item.get("sourceFile", "用户截图：医学统计学后续章节选择题"),
                    "number": len(questions) + 1,
                    "type": "single",
                    "stem": item["stem"],
                    "options": item["options"],
                    "answer": item.get("answer", ""),
                    "explanation": "",
                    "knowledge": [topic],
                }
            )

    topic_notes = {topic["name"]: topic["note"] for topic in STATISTICS_TOPICS}
    for index, question in enumerate(questions, 1):
        question["id"] = f"stat-{index:04d}"
        answer_text = question["options"].get(question["answer"], "")
        topic = question["knowledge"][0]
        question["explanation"] = f"答案为 {question['answer']}：{answer_text}。考点：{topic}。{topic_notes[topic]}"
    return questions


PARASITOLOGY_TOPICS = [
    {
        "name": "总论部分",
        "note": "重点掌握寄生、宿主、生活史、感染阶段、免疫应答和寄生虫病流行环节等基础概念。",
    },
    {
        "name": "蠕虫部分",
        "note": "重点区分线虫、吸虫、绦虫的感染方式、寄生部位、致病阶段、诊断标本和防治要点。",
    },
    {
        "name": "原虫部分",
        "note": "重点掌握阿米巴、疟原虫、利什曼原虫、滴虫、贾第虫等原虫的生活史、传播方式和致病特点。",
    },
    {
        "name": "节肢动物部分",
        "note": "重点掌握医学节肢动物的直接危害、传播媒介作用以及蚊、蝇、蚤、虱、蜱、螨等常见类群。",
    },
]


PARASITOLOGY_KEYWORDS = {
    "蠕虫部分": [
        "蠕虫",
        "线虫",
        "吸虫",
        "绦虫",
        "蛔虫",
        "蛲虫",
        "钩虫",
        "鞭虫",
        "旋毛虫",
        "丝虫",
        "血吸虫",
        "肺吸虫",
        "肝吸虫",
        "姜片虫",
        "华支睾吸虫",
        "并殖吸虫",
        "带绦虫",
        "囊尾蚴",
        "包虫",
        "棘球蚴",
    ],
    "原虫部分": [
        "原虫",
        "阿米巴",
        "疟原虫",
        "疟疾",
        "利什曼",
        "黑热病",
        "滴虫",
        "贾第",
        "弓形虫",
        "刚地",
        "隐孢子虫",
        "蓝氏",
        "滋养体",
        "包囊",
    ],
    "节肢动物部分": [
        "节肢动物",
        "按蚊",
        "库蚊",
        "伊蚊",
        "蚊",
        "蝇",
        "蚤",
        "虱",
        "蜱",
        "螨",
        "白蛉",
        "传播媒介",
        "病媒",
    ],
}


def decode_parasitology_doc():
    if not PARASITOLOGY_DOC.exists():
        return ""
    text = PARASITOLOGY_DOC.read_bytes().decode("utf-16le", errors="ignore")
    text = text.replace("\x00", "").replace("\x0b", "\n").replace("\r", "\n")
    text = text.translate(
        str.maketrans(
            {
                "Ａ": "A",
                "Ｂ": "B",
                "Ｃ": "C",
                "Ｄ": "D",
                "Ｅ": "E",
                "．": ".",
                "：": ":",
                "　": " ",
            }
        )
    )
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def infer_parasitology_topic(stem, options, section):
    haystack = stem + " " + " ".join(options.values())
    scored = []
    for topic, keys in PARASITOLOGY_KEYWORDS.items():
        score = sum(1 for key in keys if key in haystack)
        if score:
            scored.append((score, topic))
    if scored:
        return max(scored, key=lambda item: item[0])[1]
    if "蠕虫" in section:
        return "蠕虫部分"
    if "原虫" in section:
        return "原虫部分"
    if "节肢动物" in section:
        return "节肢动物部分"
    return "总论部分"


def parse_parasitology_questions():
    text = decode_parasitology_doc()
    if not text:
        return [], {"source": "寄生虫.doc", "answerMarkers": 0, "parsed": 0, "ignored": 0}

    answer_markers = list(re.finditer("参考答案", text))
    heading_matches = list(re.finditer(r"(总论部分|蠕虫部分|原虫\+节肢动物部分|原虫部分|节肢动物部分)", text))
    question_re = re.compile(r"(?m)^\s*(\d{1,3})[.．、]\s*(.+)")
    option_re = re.compile(r"(?ms)(?:^|\n)\s*([A-E])\s*[.．、]?\s*(.*?)(?=(?:\n\s*[A-E]\s*[.．、]?\s*)|\Z)")
    topic_notes = {topic["name"]: topic["note"] for topic in PARASITOLOGY_TOPICS}
    questions = []
    ignored = 0
    segment_start = 0

    for marker in answer_markers:
        answer_match = re.search(r"[A-E]", text[marker.end() : marker.end() + 40])
        segment = text[segment_start : marker.start()]
        segment_start = marker.start()
        q_matches = list(question_re.finditer(segment))
        if not answer_match or not q_matches:
            ignored += 1
            continue

        q_match = q_matches[-1]
        absolute_question_start = (marker.start() - len(segment)) + q_match.start()
        body = q_match.group(2) + "\n" + segment[q_match.end() :]
        option_start = option_re.search(body)
        if not option_start:
            ignored += 1
            continue

        stem = normalize_space(body[: option_start.start()])
        options = {}
        for option_match in option_re.finditer(body[option_start.start() :]):
            label = option_match.group(1)
            value = normalize_space(option_match.group(2))
            if value:
                options[label] = value
        if not stem or len(options) < 4:
            ignored += 1
            continue

        section = "总论部分"
        for heading in heading_matches:
            if heading.start() <= absolute_question_start:
                section = heading.group(1)
            else:
                break

        answer = answer_match.group(0)
        topic = infer_parasitology_topic(stem, options, section)
        answer_text = options.get(answer, "")
        questions.append(
            {
                "id": "",
                "source": "原题（老师配套习题）",
                "sourceFile": "寄生虫.doc",
                "number": int(q_match.group(1)),
                "type": "single",
                "stem": stem,
                "options": options,
                "answer": answer,
                "explanation": f"答案为 {answer}：{answer_text}。考点：{topic}。{topic_notes[topic]}",
                "knowledge": [topic],
            }
        )

    for index, question in enumerate(questions, 1):
        question["id"] = f"para-{index:04d}"
        question["number"] = index

    audit = {
        "source": "寄生虫.doc",
        "answerMarkers": len(answer_markers),
        "parsed": len(questions),
        "ignored": ignored,
    }
    return questions, audit


XIGAI_TOPICS = [
    {
        "name": "导论与理论体系",
        "note": "重点掌握习近平新时代中国特色社会主义思想的时代背景、主要内容、历史地位和“两个确立”的决定性意义。",
    },
    {
        "name": "中国式现代化与民族复兴",
        "note": "重点理解新时代坚持和发展中国特色社会主义、全面建设社会主义现代化国家、推进中华民族伟大复兴的核心要求。",
    },
    {
        "name": "党的领导与全面从严治党",
        "note": "重点把握中国共产党领导是中国特色社会主义最本质特征，以及党的建设、自我革命、全面从严治党的要求。",
    },
    {
        "name": "人民民主、法治与文化",
        "note": "重点区分全过程人民民主、全面依法治国、社会主义文化强国、意识形态工作和社会主义核心价值观等考点。",
    },
    {
        "name": "发展、民生与生态文明",
        "note": "重点掌握新发展理念、高质量发展、共同富裕、民生保障、人与自然和谐共生、美丽中国建设等内容。",
    },
    {
        "name": "安全、强军、统一与外交",
        "note": "重点掌握总体国家安全观、习近平强军思想、“一国两制”、祖国统一、中国特色大国外交和人类命运共同体。",
    },
]


def decode_xigai_doc():
    if not XIGAI_DOC.exists():
        return ""
    text = XIGAI_DOC.read_bytes().decode("utf-16le", errors="ignore").replace("\x00", "")
    text = text.replace("\r", "\n").replace("\x0b", "\n").replace("\x0c", "\n")
    start = text.find("导论")
    if start > -1:
        text = text[start:]
    return re.sub(r"\n{3,}", "\n\n", text)


def infer_xigai_topic(stem, options):
    haystack = stem + " " + " ".join(options.values())
    if any(key in haystack for key in ["全面从严治党", "自我革命", "党的领导", "党的建设", "反腐败"]):
        return "党的领导与全面从严治党"
    if any(key in haystack for key in ["全过程人民民主", "依法治国", "法治", "文化", "意识形态", "核心价值观"]):
        return "人民民主、法治与文化"
    if any(key in haystack for key in ["高质量发展", "共同富裕", "民生", "生态", "绿水青山", "碳达峰", "碳中和"]):
        return "发展、民生与生态文明"
    if any(key in haystack for key in ["国家安全", "强军", "一国两制", "祖国统一", "外交", "人类命运共同体", "一带一路"]):
        return "安全、强军、统一与外交"
    if any(key in haystack for key in ["中国式现代化", "民族复兴", "现代化强国", "中国特色社会主义"]):
        return "中国式现代化与民族复兴"
    return "导论与理论体系"


def parse_xigai_answer_list(value):
    answers = {}
    spans = []
    range_re = re.compile(r"(\d{1,3})\s*[-—－]\s*(\d{1,3})\s*[.．、]?\s*([A-E]+)")
    pair_re = re.compile(r"(\d{1,3})\s*[.．、]?\s*([A-E]{1,8})(?=\d{1,3}\s*(?:[.．、]|[-—－])|\s|$)")
    for match in range_re.finditer(value):
        first = int(match.group(1))
        last = int(match.group(2))
        letters = match.group(3).strip()
        if last >= first and len(letters) == last - first + 1:
            for number, answer in zip(range(first, last + 1), letters):
                answers[number] = answer
            spans.append(match.span())

    chars = list(value)
    for start, end in spans:
        for index in range(start, end):
            chars[index] = " "
    rest = "".join(chars)
    for number, answer in pair_re.findall(rest):
        answers[int(number)] = answer[:5]
    return answers


def parse_xigai_options(body):
    label = r"([A-E])(?:[.．、]\s*|\s*(?=[\u4e00-\u9fff“”]))"
    option_re = re.compile(r"(?s)" + label + r"(.*?)(?=(?:" + label + r")|$)")
    matches = list(option_re.finditer(body))
    if not matches:
        return "", {}
    stem = normalize_space(body[: matches[0].start()])
    options = {
        match.group(1): normalize_space(match.group(2)).strip("。；;，,")
        for match in matches
        if normalize_space(match.group(2))
    }
    return stem, options


def repair_xigai_missing_a_option(stem, options, answer):
    if "A" not in options and "A" in answer and "）。" in stem:
        prefix, suffix = stem.split("）。", 1)
        suffix = normalize_space(suffix)
        if suffix:
            stem = prefix + "）。"
            options = {"A": suffix, **options}
    return stem, options


def parse_xigai_questions():
    text = decode_xigai_doc()
    if not text:
        return [], {"source": "习概导引整理（带答案）(1).doc", "parsed": 0, "referenceBlocks": 0, "inlineAnswers": 0, "ignored": 0}

    question_start_re = re.compile(r"(?m)^\s*(\d{1,3})[.．、]?\s*")
    answer_marker_re = re.compile(r"参考答案\s*[^\n\dA-E]*")
    heading_terms = ["（一）单选题", "单选题", "一、单项选择题", "（二）多选题", "二、多选题", "多选题"]
    heading_re = re.compile("|".join(re.escape(term) for term in heading_terms))
    topic_notes = {topic["name"]: topic["note"] for topic in XIGAI_TOPICS}
    parsed = []
    ignored = 0
    reference_blocks = 0
    segment_start = 0

    def add_question(number, stem, options, answer, source_hint):
        nonlocal ignored
        stem, options = repair_xigai_missing_a_option(stem, options, answer)
        if not stem or len(options) < 4 or not answer or any(key not in options for key in answer):
            ignored += 1
            return
        topic = infer_xigai_topic(stem, options)
        answer_text = "；".join(f"{key}. {options[key]}" for key in answer if key in options)
        parsed.append(
            {
                "id": "",
                "source": "原题（老师配套习题）",
                "sourceFile": f"习概导引整理（带答案）(1).doc；{source_hint}",
                "number": number,
                "type": "multiple" if len(answer) > 1 else "single",
                "stem": stem,
                "options": options,
                "answer": answer,
                "explanation": f"答案为 {answer}：{answer_text}。考点：{topic}。{topic_notes[topic]}",
                "knowledge": [topic],
            }
        )

    for marker in answer_marker_re.finditer(text):
        segment = text[segment_start : marker.start()]
        headings = list(heading_re.finditer(segment))
        if headings:
            segment = segment[headings[-1].end() :]
        answers = parse_xigai_answer_list(text[marker.end() : marker.end() + 500])
        question_matches = list(question_start_re.finditer(segment))
        block_count = 0
        for index, match in enumerate(question_matches):
            number = int(match.group(1))
            end = question_matches[index + 1].start() if index + 1 < len(question_matches) else len(segment)
            body = segment[match.end() : end].strip()
            if "答案" in body:
                continue
            stem, options = parse_xigai_options(body)
            if number in answers:
                add_question(number, stem, options, answers[number], "参考答案表")
                block_count += 1
        if block_count:
            reference_blocks += 1
        segment_start = marker.end()

    inline_re = re.compile(r"(?ms)(?:^|\n)\s*(\d{1,3})[.．、]?\s*(.*?)(?:\n\s*)?答案[:：]\s*([A-E]{1,5})")
    inline_answers = 0
    for match in inline_re.finditer(text):
        number = int(match.group(1))
        stem, options = parse_xigai_options(match.group(2).strip())
        if any(marker in stem for marker in ["答案要点", "答：", "重要知识点", "练习题"]):
            continue
        if len(stem) > 500:
            continue
        add_question(number, stem, options, match.group(3), "逐题答案")
        inline_answers += 1

    questions = []
    seen = set()
    for item in parsed:
        key = normalize_key(item["stem"])
        if key in seen:
            continue
        seen.add(key)
        questions.append(item)

    for index, question in enumerate(questions, 1):
        question["id"] = f"xigai-{index:04d}"
        question["number"] = index

    audit = {
        "source": "习概导引整理（带答案）(1).doc",
        "referenceBlocks": reference_blocks,
        "inlineAnswers": inline_answers,
        "parsed": len(questions),
        "ignored": ignored,
    }
    return questions, audit


PATHOLOGY_TOPICS = [
    {
        "name": "急性炎症与感染",
        "note": "重点识别中性粒细胞弥漫浸润、渗出物、化脓性炎、结核性肉芽肿和虫卵肉芽肿等形态。",
    },
    {
        "name": "循环障碍与血管病变",
        "note": "重点识别水肿液、脂肪栓塞、血栓机化再通、动脉粥样斑块和胆固醇结晶裂隙。",
    },
    {
        "name": "肿瘤病理",
        "note": "重点区分腺癌、鳞状细胞癌和印戒细胞癌转移，抓住异型性、浸润性生长、癌珠和印戒细胞。",
    },
    {
        "name": "肝胆与消化系统病变",
        "note": "重点识别假小叶、脂肪空泡、胃溃疡四层结构以及慢性炎和纤维化改变。",
    },
    {
        "name": "妊娠滋养细胞与胎盘病变",
        "note": "重点识别绒毛水肿、间质血管消失和滋养层细胞增生。",
    },
]


PATHOLOGY_SLIDES = [
    {
        "number": 3,
        "diagnosis": "急性蜂窝织性阑尾炎",
        "tissue": "阑尾",
        "topic": "急性炎症与感染",
        "features": "粘膜层、粘膜下层、肌层及浆膜层均充血水肿，组织内大量中性粒细胞弥漫性浸润，可见渗出物。",
        "image": "./public/pathology-appendicitis.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Acute_Appendicitis,_HE_1.jpg",
        "credit": "Wikimedia Commons：Acute Appendicitis, HE",
    },
    {
        "number": 5,
        "diagnosis": "肺水肿",
        "tissue": "肺",
        "topic": "循环障碍与血管病变",
        "features": "肺泡壁毛细血管扩张，充满红细胞；肺泡腔内有大量均匀红染的水肿液。",
        "image": "./public/pathology-pulmonary-edema.jpg",
        "page": "https://pathology.or.jp/corepicturesEN/05/c01/04.html",
        "credit": "Japanese Society of Pathology Core Pictures：Pulmonary edema",
    },
    {
        "number": 6,
        "diagnosis": "肺脂肪栓塞",
        "tissue": "肺",
        "topic": "循环障碍与血管病变",
        "features": "肺间质血管和肺泡壁毛细血管内可见大小不一的圆形或不规则形脂肪栓塞物。",
        "image": "./public/pathology-fat-embolism.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Histopathology_of_a_pulmonary_artery_with_fat_embolism_and_a_bone_marrow_fragment.jpg",
        "credit": "Wikimedia Commons：Pulmonary artery fat embolism",
    },
    {
        "number": 7,
        "diagnosis": "肠腺癌",
        "tissue": "结肠",
        "topic": "肿瘤病理",
        "features": "癌性腺体形状不规则、大小不一致，细胞异型性明显，呈浸润性生长。",
        "image": "https://upload.wikimedia.org/wikipedia/commons/e/ee/Colorectal_adenocarcinoma_(2).jpg",
        "page": "https://en.wikipedia.org/wiki/Histopathology_of_colorectal_adenocarcinoma",
        "credit": "Wikimedia Commons：Colorectal adenocarcinoma",
    },
    {
        "number": 8,
        "diagnosis": "血吸虫肝",
        "tissue": "肝",
        "topic": "急性炎症与感染",
        "features": "慢性虫卵结节内可见异物巨细胞、淋巴细胞浸润和肉芽组织增生，可见钙化死卵。",
        "image": "./public/pathology-schistosomiasis-liver.jpg",
        "page": "https://pathology.or.jp/corepicturesEN/10/c06/02.html",
        "credit": "Japanese Society of Pathology Core Pictures：Schistosomiasis",
    },
    {
        "number": 12,
        "diagnosis": "水泡状胎块",
        "tissue": "胎盘",
        "topic": "妊娠滋养细胞与胎盘病变",
        "features": "胎盘绒毛高度水肿，间质内血管消失，表面滋养层细胞增生。",
        "image": "./public/pathology-hydatidiform-mole.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Hydatidiform_mole_(1)_complete_type.jpg",
        "credit": "Wikimedia Commons：Hydatidiform mole",
    },
    {
        "number": 13,
        "diagnosis": "转移性印戒细胞癌",
        "tissue": "淋巴结",
        "topic": "肿瘤病理",
        "features": "淋巴结边缘窦处可见大量印戒细胞，胞浆内黏液将细胞核挤向一侧。",
        "image": "./public/pathology-signet-ring-node.jpg",
        "page": "https://patologia.cm.umk.pl/atlas/lymphatics/signet/",
        "credit": "Patologia CM UMK：Metastatic signet-ring cell carcinoma",
    },
    {
        "number": 15,
        "diagnosis": "鳞状细胞癌",
        "tissue": "皮肤",
        "topic": "肿瘤病理",
        "features": "癌细胞呈片状或巢状排列，细胞多边形、胞浆丰富、核异型明显；癌巢中心角化形成癌珠。",
        "image": "./public/pathology-squamous-cell-carcinoma.jpg",
        "page": "https://pathology.or.jp/corepictures2010/20/c09/04.html",
        "credit": "Japanese Society of Pathology Core Pictures：Squamous cell carcinoma",
    },
    {
        "number": 17,
        "diagnosis": "大叶性肺炎",
        "tissue": "肺",
        "topic": "急性炎症与感染",
        "features": "病变均匀一致，肺泡腔内充满大量纤维素和嗜中性白细胞，纤维素互相结成网。",
        "image": "./public/pathology-lobar-pneumonia.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Lung_biopsy_showing_lobar_pneumonia_10X.jpg",
        "credit": "Wikimedia Commons：Lobar pneumonia",
    },
    {
        "number": 18,
        "diagnosis": "肝硬化",
        "tissue": "肝",
        "topic": "肝胆与消化系统病变",
        "features": "肝小叶正常结构破坏，形成许多大小不等的假小叶，其间有纤维组织增生和大量炎细胞浸润。",
        "image": "https://upload.wikimedia.org/wikipedia/commons/9/94/Cirrhosis_high_mag.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Cirrhosis_high_mag.jpg",
        "credit": "Wikimedia Commons：Cirrhosis high magnification",
    },
    {
        "number": 20,
        "diagnosis": "血栓",
        "tissue": "静脉",
        "topic": "循环障碍与血管病变",
        "features": "静脉内血栓由淡红色血小板和血细胞构成，局部可见裂隙及内皮覆盖，提示机化再通。",
        "image": "https://upload.wikimedia.org/wikipedia/commons/7/79/Complete_organization_of_thromboembolus_with_recanalization.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Complete_organization_of_thromboembolus_with_recanalization.jpg",
        "credit": "Wikimedia Commons：Organized thromboembolus with recanalization",
    },
    {
        "number": 21,
        "diagnosis": "动脉粥样硬化",
        "tissue": "动脉",
        "topic": "循环障碍与血管病变",
        "features": "内膜表面纤维帽形成并可破溃，其下为粥样坏死灶，可见胆固醇结晶针状裂隙、钙盐沉积、泡沫细胞和肉芽组织。",
        "image": "https://upload.wikimedia.org/wikipedia/commons/f/f2/RCA_atherosclerosis.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:RCA_atherosclerosis.jpg",
        "credit": "Wikimedia Commons：Coronary atherosclerosis",
    },
    {
        "number": 23,
        "diagnosis": "胃溃疡",
        "tissue": "胃",
        "topic": "肝胆与消化系统病变",
        "features": "可见渗出层、坏死层、肉芽组织层和瘢痕层；肉芽组织内有新生毛细血管、纤维母细胞及慢性炎细胞。",
        "image": "./public/pathology-gastric-ulcer.jpg",
        "page": "https://pathorama.ch/pathopic/4977/show",
        "credit": "Pathorama：Gastric ulcer histology",
    },
    {
        "number": 24,
        "diagnosis": "肺结核",
        "tissue": "肺",
        "topic": "急性炎症与感染",
        "features": "可见结核结节和干酪样坏死，周围有类上皮细胞、郎罕斯巨细胞及淋巴细胞浸润。",
        "image": "./public/pathology-lung-tuberculosis.jpg",
        "page": "https://eliph.klinikum.uni-heidelberg.de/allg/106/lungentuberkulose",
        "credit": "Heidelberg ELIPH：Lung tuberculosis",
    },
    {
        "number": 25,
        "diagnosis": "肾结核",
        "tissue": "肾",
        "topic": "急性炎症与感染",
        "features": "肾组织内可见结核结节，中央常发生干酪样坏死，周围为上皮样细胞、多核巨细胞、淋巴细胞和纤维细胞。",
        "image": "./public/pathology-kidney-tuberculosis.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Tuberculous_caseous_granuloma_(1)_TBLB.jpg",
        "credit": "Wikimedia Commons：Tuberculous caseous granuloma",
    },
    {
        "number": 28,
        "diagnosis": "化脓性脑膜炎",
        "tissue": "脑",
        "topic": "急性炎症与感染",
        "features": "蛛网膜下腔增宽，血管高度扩张充血，可见大量嗜中性白细胞、单核细胞和淋巴细胞浸润，炎症未累及脑实质。",
        "image": "https://www.meddean.luc.edu/lumen/meded/mech/cases/case5/neuro05.jpg",
        "page": "https://www.meddean.luc.edu/lumen/meded/mech/cases/case5/list.htm",
        "credit": "Loyola University Medical Education：Acute meningitis",
    },
    {
        "number": 30,
        "diagnosis": "肝脂肪变性",
        "tissue": "肝",
        "topic": "肝胆与消化系统病变",
        "features": "肝小叶结构基本完好，小叶中央区肝细胞胞浆内有大小不等的脂肪空泡，严重者细胞核被挤向一边。",
        "image": "./public/pathology-fatty-liver.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Fatty_change_liver_-_Lipid_steatosis_10X.jpg",
        "credit": "Wikimedia Commons：Fatty change liver",
    },
]


def parse_pathology_questions():
    letters = ["A", "B", "C", "D"]
    topic_notes = {topic["name"]: topic["note"] for topic in PATHOLOGY_TOPICS}
    questions = []
    diagnoses = [slide["diagnosis"] for slide in PATHOLOGY_SLIDES]

    for index, slide in enumerate(PATHOLOGY_SLIDES):
        same_topic = [
            item
            for item in PATHOLOGY_SLIDES
            if item["diagnosis"] != slide["diagnosis"] and item["topic"] == slide["topic"]
        ]
        pool = same_topic + [
            item
            for item in PATHOLOGY_SLIDES
            if item["diagnosis"] != slide["diagnosis"] and item not in same_topic
        ]
        distractors = []
        cursor = index
        while len(distractors) < 3 and pool:
            candidate = pool[cursor % len(pool)]["diagnosis"]
            if candidate not in distractors and candidate != slide["diagnosis"]:
                distractors.append(candidate)
            cursor += 1

        correct_position = index % 4
        ordered = distractors[:]
        ordered.insert(correct_position, slide["diagnosis"])
        options = {letters[i]: ordered[i] for i in range(4)}
        answer = letters[correct_position]
        answer_text = options[answer]
        source_file = "病理切片整理137937885386235187.1ea17c5a4335782.doc；网络显微图检索"
        questions.append(
            {
                "id": f"path-{index + 1:04d}",
                "source": "原题（老师配套习题）",
                "sourceFile": source_file,
                "number": index + 1,
                "type": "single",
                "stem": f"观察图中{slide['tissue']}切片的局部形态，最可能的病理诊断是？",
                "options": options,
                "answer": answer,
                "explanation": (
                    f"答案为 {answer}：{answer_text}。镜下要点：{slide['features']} "
                    f"考点：{slide['topic']}。{topic_notes[slide['topic']]}"
                ),
                "knowledge": [slide["topic"]],
                "image": {
                    "src": slide["image"],
                    "alt": f"{slide['diagnosis']}显微切片图",
                    "caption": f"{slide['tissue']}切片示教图：用于训练识别{slide['diagnosis']}的局部镜下特征",
                    "page": slide["page"],
                    "credit": slide["credit"],
                },
            }
        )

    audit = {
        "source": PATHOLOGY_DOC.name,
        "parsed": len(questions),
        "diagnoses": diagnoses,
        "localImages": sum(1 for slide in PATHOLOGY_SLIDES if slide["image"].startswith("./public/")),
    }
    return questions, audit


def main():
    originals = json.loads(QUESTIONS_IN.read_text(encoding="utf-8"))
    originals = [enrich_original(q) for q in originals if len(q.get("options", {})) >= 4]
    existing_keys = {normalize_key(q["stem"]) for q in originals}
    for item in LATEST_ORIGINALS:
        if normalize_key(item["stem"]) not in existing_keys:
            originals.append(enrich_original(item))
            existing_keys.add(normalize_key(item["stem"]))
    for i, q in enumerate(originals, 1):
        q["id"] = f"orig-{i:04d}"
        q["source"] = "原题（老师配套习题）"

    extended = []
    for i, q in enumerate(EXTENDED, 1):
        topic = next((t for t in TOPICS if t["name"] == q["knowledge"][0]), TOPICS[0])
        item = {
            "id": f"ai-{i:04d}",
            "source": "新编拓展题（AI深度改编）",
            "sourceFile": "基于PPT知识点、期末重点与原题考点改编",
            "number": i,
            "type": "single",
            **q,
        }
        if topic["note"] not in item["explanation"]:
            item["explanation"] += " " + topic["note"]
        extended.append(item)

    psychology_payload = {
        "meta": {
            "project": "皮特智学",
            "subject": "医学心理学",
            "subjectId": "medical-psychology",
            "school": "扬州大学医学部",
            "originalCount": len(originals),
            "extendedCount": len(extended),
            "missingAnswerCount": sum(1 for q in originals if not q.get("answer")),
            "latestAudit": {
                "source": LATEST_SOURCE,
                "correctedExisting": len(LATEST_CORRECTIONS),
                "addedOriginals": len([q for q in originals if LATEST_SOURCE in q.get("sourceFile", "") and q["stem"] in [item["stem"] for item in LATEST_ORIGINALS]]),
            },
            "skippedLegacyPpt": json.loads((ROOT / "extracted" / "skipped.json").read_text(encoding="utf-8")),
        },
        "topics": [{"name": t["name"], "note": t["note"]} for t in TOPICS],
        "resources": [],
        "questions": originals + extended,
    }

    statistics = parse_statistics_questions()
    statistics_payload = {
        "meta": {
            "project": "皮特智学",
            "subject": "医学统计学",
            "subjectId": "medical-statistics",
            "school": "扬州大学医学部",
            "originalCount": len(statistics),
            "extendedCount": 0,
            "missingAnswerCount": sum(1 for q in statistics if not q.get("answer")),
            "source": "医学统计学选择题部分.docx",
        },
        "topics": STATISTICS_TOPICS,
        "resources": [
            {
                "title": "常用离散趋势指标",
                "type": "思维导图",
                "src": "./public/statistics-map-dispersion.jpg",
            },
            {
                "title": "正态分布与标准正态分布",
                "type": "思维导图",
                "src": "./public/statistics-map-normal.png",
            },
            {
                "title": "相对数与率",
                "type": "思维导图",
                "src": "./public/statistics-map-rate.png",
            },
        ],
        "questions": statistics,
    }

    parasitology, parasitology_audit = parse_parasitology_questions()
    parasitology_payload = {
        "meta": {
            "project": "皮特智学",
            "subject": "医学寄生虫学",
            "subjectId": "medical-parasitology",
            "school": "扬州大学医学部",
            "originalCount": len(parasitology),
            "extendedCount": 0,
            "missingAnswerCount": sum(1 for q in parasitology if not q.get("answer")),
            "source": "寄生虫.doc",
            "parseAudit": parasitology_audit,
        },
        "topics": PARASITOLOGY_TOPICS,
        "resources": [],
        "questions": parasitology,
    }

    xigai, xigai_audit = parse_xigai_questions()
    xigai_payload = {
        "meta": {
            "project": "皮特智学",
            "subject": "习概",
            "subjectId": "xigai",
            "school": "扬州大学医学部",
            "originalCount": len(xigai),
            "extendedCount": 0,
            "missingAnswerCount": sum(1 for q in xigai if not q.get("answer")),
            "source": "习概导引整理（带答案）(1).doc",
            "parseAudit": xigai_audit,
        },
        "topics": XIGAI_TOPICS,
        "resources": [],
        "questions": xigai,
    }

    pathology, pathology_audit = parse_pathology_questions()
    pathology_payload = {
        "meta": {
            "project": "皮特智学",
            "subject": "病理切片",
            "subjectId": "pathology-slides",
            "school": "扬州大学医学部",
            "originalCount": len(pathology),
            "extendedCount": 0,
            "missingAnswerCount": sum(1 for q in pathology if not q.get("answer")),
            "source": "病理切片整理137937885386235187.1ea17c5a4335782.doc",
            "parseAudit": pathology_audit,
        },
        "topics": PATHOLOGY_TOPICS,
        "resources": [
            {
                "title": slide["diagnosis"],
                "type": slide["tissue"],
                "src": slide["image"],
            }
            for slide in PATHOLOGY_SLIDES
        ],
        "questions": pathology,
    }

    subjects = {
        "medical-psychology": psychology_payload,
        "medical-statistics": statistics_payload,
        "medical-parasitology": parasitology_payload,
        "xigai": xigai_payload,
        "pathology-slides": pathology_payload,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    script = (
        "window.PETE_SUBJECTS = "
        + json.dumps(subjects, ensure_ascii=False, indent=2)
        + ";\nwindow.PETE_QUESTIONS = window.PETE_SUBJECTS['medical-psychology'];\n"
    )
    OUT.write_text(script, encoding="utf-8")
    print(json.dumps({"subjects": {key: value["meta"] for key, value in subjects.items()}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
