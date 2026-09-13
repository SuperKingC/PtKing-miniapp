# Chiikawa 四选一题库重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Chiikawa 测试从 24 题八选一重构为 32 题四选一，在降低单题阅读负担的同时保持八角色曝光平衡，并为总票平局增加末 8 题二次判定。

**Architecture:** 题目内容继续由 miniapp/src/domain/tests/chiikawaBondTest.ts 提供，选项仍一题一票投向一个角色；通用 archetype 引擎新增可选的 recent-answers 平票配置，未配置的测试保持旧行为。答题页、报告页、记录和 COS loader 不新增 Chiikawa 分支，继续消费现有 TestDefinition、TestResult 和题库签名。

**Tech Stack:** TypeScript、Taro 4/React 18、Vitest、微信小程序构建、现有静态测试注册表与 COS 动态测试定义。

---

## 文件变更总览

- Modify: miniapp/src/domain/testEngine.ts — 为 archetype 增加可选平票配置和末窗口判定。
- Modify: miniapp/src/domain/testEngine.test.ts — 先锁定平票窗口、回退和旧行为不变。
- Modify: miniapp/src/domain/tests/chiikawaBondTest.ts — 保留八个报告，重写为 32 题 × 4 选项，并配置末 8 题平票策略。
- Create: miniapp/src/domain/tests/chiikawaBondTest.test.ts — 锁定题量、选项数、角色曝光矩阵、文案和报告可达性。
- Modify: docs/features/test-engine.md — 更新通用 archetype 平票能力和测试数量说明。
- Modify: docs/features/test-content-tarot-share.md — 更新上架测试清单和 Chiikawa 题库说明。
- Create (ignored during implementation): miniapp/dist/ — freshly built 微信小程序产物，只用于预览，不纳入提交。

工作区中已有的其他修改、截图、生成图和未跟踪文件均不属于本计划，不得 stage、回退或重写。

## 执行前检查

- [ ] **Step 1: 确认基线和工作区边界**

运行：

~~~powershell
git status --short --branch
git rev-parse --short HEAD
git log -1 --oneline
~~~

预期：当前分支仍为 main，基线包含已提交的设计文档 35523c9；工作区已有的修改全部记录下来但不处理。执行实现时只允许触碰本计划列出的六个代码、测试和功能文档路径。

- [ ] **Step 2: 确认设计文档可读**

运行：

~~~powershell
Get-Content -Raw docs/superpowers/specs/2026-09-13-chiikawa-four-option-design.md
~~~

预期：目标为 32 题四选一、角色曝光平衡、末 8 题平票、其他测试行为不变；如果实现过程中出现超出这些目标的需求，先停下重新确认范围。

## Task 1: 先为通用 archetype 平票写失败测试

**Files:**
- Modify: miniapp/src/domain/testEngine.test.ts

- [ ] **Step 1: 增加带平票配置的 10 题夹具**

在现有 archetypeFixture() 后增加以下夹具。前 8 题中 fox 3 票、owl 5 票，末 2 题都投 fox，最终总票为 5:5，末窗口应选 fox；第二个答案序列让末窗口 1:1，最终按定义顺序选 fox。

~~~ts
function tieBreakArchetypeFixture(): TestDefinition {
  return {
    ...dimensionFixture(),
    id: 'fixture-arch-tie-break',
    title: '平票类型测试',
    questions: Array.from({ length: 10 }, (_, index) => ({
      text: 'q' + (index + 1),
      options: [
        { text: 'fox', reportId: 'fox' },
        { text: 'owl', reportId: 'owl' },
      ],
    })),
    scoring: {
      type: 'archetype',
      reports: ['fox', 'owl'],
      tieBreak: { type: 'recent-answers', window: 2 },
    },
    reports: {
      fox: { id: 'fox', title: '狐狸型', tagline: 't', summary: 's', detail: [] },
      owl: { id: 'owl', title: '猫头鹰型', tagline: 't', summary: 's', detail: [] },
    },
  }
}
~~~

- [ ] **Step 2: 增加平票规则的红灯测试**

在 describe('testEngine archetype scoring', ...) 中追加：

~~~ts
  it('uses the recent answer window to resolve an overall tie', () => {
    const result = scoreTest(tieBreakArchetypeFixture(), [0, 0, 0, 1, 1, 1, 1, 1, 0, 0])
    expect(result.reportId).toBe('fox')
    expect(result.archetypeVotes).toEqual([
      { reportId: 'fox', count: 5 },
      { reportId: 'owl', count: 5 },
    ])
  })

  it('falls back to report order when the recent window is also tied', () => {
    const result = scoreTest(tieBreakArchetypeFixture(), [0, 0, 0, 0, 1, 1, 1, 1, 0, 1])
    expect(result.reportId).toBe('fox')
  })

  it('keeps the old report-order tie behavior when no tie-break is configured', () => {
    expect(scoreTest(archetypeFixture(), [0, 1, 0]).reportId).toBe('fox')
  })

  it('rejects a non-positive recent-answer window', () => {
    const broken = tieBreakArchetypeFixture()
    broken.scoring = { type: 'archetype', reports: ['fox', 'owl'], tieBreak: { type: 'recent-answers', window: 0 } }
    expect(() => scoreTest(broken, new Array(10).fill(0))).toThrow('invalid_test_definition')
  })
~~~

- [ ] **Step 3: 运行红灯测试**

运行：

~~~powershell
npm --prefix miniapp run test -- src/domain/testEngine.test.ts
~~~

预期：新增平票窗口测试失败，原因是 TestScoring 尚未接受 tieBreak，且引擎仍只按报告定义顺序判定平票；现有旧测试应继续通过。

## Task 2: 实现可选的末窗口平票判定

**Files:**
- Modify: miniapp/src/domain/testEngine.ts

- [ ] **Step 1: 扩展 archetype 类型，不影响其他计分模式**

在 TestScoring 的 archetype 分支中加入内联配置：

~~~ts
  | {
      type: 'archetype'
      reports: string[]
      tieBreak?: {
        type: 'recent-answers'
        window: number
      }
    }
~~~

不要把 tieBreak 加到 dimension、band 或 factor 分支。

- [ ] **Step 2: 在 scoreArchetype 中先校验配置，再统计总票**

把函数开头改成以下逻辑，保留现有每题 reportId 合法性校验：

~~~ts
function scoreArchetype(def: TestDefinition, answers: number[]): TestResult {
  const scoring = def.scoring as Extract<TestScoring, { type: 'archetype' }>
  const tieBreak = scoring.tieBreak
  if (
    tieBreak &&
    (tieBreak.type !== 'recent-answers' || !Number.isInteger(tieBreak.window) || tieBreak.window <= 0)
  ) {
    invalidDefinition(def.id, 'tie_break')
  }

  const counts = new Map<string, number>()
  def.questions.forEach((question, qIndex) => {
    const chosen = question.options[answers[qIndex]]
    const reportId = chosen.reportId
    if (!reportId || !scoring.reports.includes(reportId)) {
      invalidDefinition(def.id, 'question_' + qIndex + '_report')
    }
    counts.set(reportId, (counts.get(reportId) ?? 0) + 1)
  })
~~~

- [ ] **Step 3: 用总票候选和末窗口候选替换旧的单层循环**

在总票统计之后、archetypeVotes 构造之前使用：

~~~ts
  const best = Math.max(...scoring.reports.map((id) => counts.get(id) ?? 0))
  const tied = scoring.reports.filter((id) => (counts.get(id) ?? 0) === best)
  let reportId = tied[0]

  if (tied.length > 1 && tieBreak?.type === 'recent-answers') {
    const start = Math.max(0, answers.length - tieBreak.window)
    const recentCounts = new Map<string, number>()
    answers.forEach((answer, qIndex) => {
      if (qIndex < start) return
      const recentReportId = def.questions[qIndex].options[answer].reportId
      if (recentReportId) recentCounts.set(recentReportId, (recentCounts.get(recentReportId) ?? 0) + 1)
    })
    const recentBest = Math.max(...tied.map((id) => recentCounts.get(id) ?? 0))
    const recentWinners = tied.filter((id) => (recentCounts.get(id) ?? 0) === recentBest)
    if (recentWinners.length === 1) reportId = recentWinners[0]
  }

  if (best <= 0) invalidDefinition(def.id, 'archetype_no_votes')
  if (!def.reports[reportId]) invalidDefinition(def.id, 'missing_report_' + reportId)
~~~

保留现有 archetypeVotes 生成代码，使分布仍来自所有题目的原始票数；不要把末窗口的票覆盖到分布图。

- [ ] **Step 4: 运行绿灯测试**

运行：

~~~powershell
npm --prefix miniapp run test -- src/domain/testEngine.test.ts
~~~

预期：testEngine 全部通过，且未配置 tieBreak 的既有 archetype 夹具结果不变。

- [ ] **Step 5: 提交通用引擎变更**

~~~powershell
git add miniapp/src/domain/testEngine.ts miniapp/src/domain/testEngine.test.ts
git commit -m "增加 archetype 末题窗口平票判定"
~~~

## Task 3: 先写 Chiikawa 题库契约测试

**Files:**
- Create: miniapp/src/domain/tests/chiikawaBondTest.test.ts

- [ ] **Step 1: 写固定角色和计数辅助函数**

新测试文件使用：

~~~ts
import { describe, expect, it } from 'vitest'
import { scoreTest } from '../testEngine'
import { CHIIKAWA_BOND_TEST } from './chiikawaBondTest'

const ROLES = ['chiikawa', 'hachiware', 'usagi', 'rakko', 'kurimanju', 'momonga', 'kaiman', 'shisa'] as const
type Role = (typeof ROLES)[number]

function countRoles(questionIndexes: number[] = CHIIKAWA_BOND_TEST.questions.map((_, index) => index)) {
  const counts = new Map<Role, number>(ROLES.map((role) => [role, 0]))
  questionIndexes.forEach((questionIndex) => {
    CHIIKAWA_BOND_TEST.questions[questionIndex].options.forEach((option) => {
      counts.set(option.reportId as Role, (counts.get(option.reportId as Role) ?? 0) + 1)
    })
  })
  return counts
}
~~~

- [ ] **Step 2: 锁定 32 题、四选项、短文案和题目唯一性**

追加：

~~~ts
it('uses 32 questions with four short, unique options each', () => {
  expect(CHIIKAWA_BOND_TEST.questions).toHaveLength(32)
  expect(CHIIKAWA_BOND_TEST.intro.join('')).toContain('32')
  expect(CHIIKAWA_BOND_TEST.intro.join('')).not.toContain('24')
  for (const question of CHIIKAWA_BOND_TEST.questions) {
    expect(question.options).toHaveLength(4)
    expect(new Set(question.options.map((option) => option.text)).size).toBe(4)
    for (const option of question.options) {
      expect(option.text.length).toBeLessThanOrEqual(42)
      expect(option.text).not.toMatch(/吉伊|小八|乌萨奇|海獭|栗子馒头|飞鼠|铠甲先生|狮萨/)
    }
  }
  expect(new Set(CHIIKAWA_BOND_TEST.questions.map((question) => question.text)).size).toBe(32)
})
~~~

- [ ] **Step 3: 锁定角色总曝光、位置曝光、末窗口曝光和平衡共现**

追加：

~~~ts
it('balances role exposure, option positions, recent window, and pair co-occurrence', () => {
  const allCounts = countRoles()
  expect([...allCounts.values()]).toEqual(Array(8).fill(16))

  const positionCounts = ROLES.map((role) =>
    [0, 1, 2, 3].map((position) =>
      CHIIKAWA_BOND_TEST.questions.filter((question) => question.options[position].reportId === role).length,
    ),
  )
  expect(positionCounts).toEqual(ROLES.map(() => [4, 4, 4, 4]))

  const recentCounts = countRoles(Array.from({ length: 8 }, (_, index) => 24 + index))
  expect([...recentCounts.values()]).toEqual(Array(8).fill(4))

  const pairCounts = new Map<string, number>()
  CHIIKAWA_BOND_TEST.questions.forEach((question) => {
    const roles = question.options.map((option) => option.reportId).sort()
    for (let left = 0; left < roles.length; left += 1) {
      for (let right = left + 1; right < roles.length; right += 1) {
        const key = roles[left] + '|' + roles[right]
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  })
  const pairValues = [...pairCounts.values()]
  expect(pairValues).toHaveLength(28)
  expect(Math.max(...pairValues) - Math.min(...pairValues)).toBeLessThanOrEqual(1)
})
~~~

- [ ] **Step 4: 锁定八个结果可达和 Chiikawa 平票配置**

追加：

~~~ts
it('keeps every report reachable and configures the eight-question tie break', () => {
  expect(CHIIKAWA_BOND_TEST.scoring).toEqual({
    type: 'archetype',
    reports: [...ROLES],
    tieBreak: { type: 'recent-answers', window: 8 },
  })

  for (const target of ROLES) {
    const counts = new Map<Role, number>(ROLES.map((role) => [role, 0]))
    const answers = CHIIKAWA_BOND_TEST.questions.map((question) => {
      const targetIndex = question.options.findIndex((option) => option.reportId === target)
      if (targetIndex >= 0) {
        counts.set(target, (counts.get(target) ?? 0) + 1)
        return targetIndex
      }
      let bestIndex = 0
      let bestCount = Number.POSITIVE_INFINITY
      question.options.forEach((option, optionIndex) => {
        const current = counts.get(option.reportId as Role) ?? 0
        if (current < bestCount) {
          bestCount = current
          bestIndex = optionIndex
        }
      })
      const fallbackRole = question.options[bestIndex].reportId as Role
      counts.set(fallbackRole, (counts.get(fallbackRole) ?? 0) + 1)
      return bestIndex
    })
    expect(scoreTest(CHIIKAWA_BOND_TEST, answers).reportId).toBe(target)
  }
})
~~~

- [ ] **Step 5: 运行红灯测试**

运行：

~~~powershell
npm --prefix miniapp run test -- src/domain/tests/chiikawaBondTest.test.ts
~~~

预期：在旧题库上因题数、每题选项数、短文案和配置不符合而失败；这确认契约确实约束了本次改动目标。

## Task 4: 重写 Chiikawa 为 32 题四选一

**Files:**
- Modify: miniapp/src/domain/tests/chiikawaBondTest.ts

- [ ] **Step 1: 将题目辅助函数改成四角色显式输入**

保留 OPTION_NAMES 只作为角色报告/默认描述的来源，将原来的八段数组辅助函数替换为：

~~~ts
type RoleId = (typeof OPTION_NAMES)[number][0]

function q(text: string, options: Array<[RoleId, string]>): TestDefinition['questions'][number] {
  return {
    text,
    options: options.map(([reportId, optionText]) => ({ text: optionText, reportId })),
  }
}
~~~

每个选项文案使用短场景直接反应，不能出现角色名；报告对象 REPORTS 原样保留。

- [ ] **Step 2: 按固定 32 行角色矩阵重排选项顺序**

每一行是该题四个选项的 reportId 顺序；第 25—32 行是末 8 题校准窗口。实现时每行使用四个独立文案，不复制整段旧八选项。

| 题号 | 角色顺序 |
|---:|---|
| 01 | usagi / kurimanju / momonga / shisa |
| 02 | rakko / momonga / kaiman / chiikawa |
| 03 | kurimanju / kaiman / shisa / hachiware |
| 04 | momonga / shisa / chiikawa / usagi |
| 05 | kaiman / chiikawa / hachiware / rakko |
| 06 | shisa / hachiware / usagi / kurimanju |
| 07 | chiikawa / usagi / rakko / momonga |
| 08 | hachiware / rakko / kurimanju / kaiman |
| 09 | chiikawa / kurimanju / kaiman / shisa |
| 10 | hachiware / momonga / shisa / chiikawa |
| 11 | usagi / kaiman / chiikawa / hachiware |
| 12 | rakko / shisa / hachiware / usagi |
| 13 | kurimanju / chiikawa / usagi / rakko |
| 14 | momonga / hachiware / rakko / kurimanju |
| 15 | kaiman / usagi / kurimanju / momonga |
| 16 | shisa / rakko / momonga / kaiman |
| 17 | chiikawa / hachiware / momonga / kaiman |
| 18 | hachiware / usagi / kaiman / shisa |
| 19 | usagi / rakko / shisa / chiikawa |
| 20 | rakko / kurimanju / chiikawa / hachiware |
| 21 | kurimanju / momonga / hachiware / usagi |
| 22 | momonga / kaiman / usagi / rakko |
| 23 | kaiman / shisa / rakko / kurimanju |
| 24 | shisa / chiikawa / kurimanju / momonga |
| 25 | chiikawa / hachiware / rakko / shisa |
| 26 | hachiware / usagi / kurimanju / chiikawa |
| 27 | usagi / rakko / momonga / hachiware |
| 28 | rakko / kurimanju / kaiman / usagi |
| 29 | kurimanju / momonga / shisa / rakko |
| 30 | momonga / kaiman / chiikawa / kurimanju |
| 31 | kaiman / shisa / hachiware / momonga |
| 32 | shisa / chiikawa / usagi / kaiman |

题目场景分配固定为：1—4 日常选择，5—8 突发状况，9—12 社交互动，13—16 亲密关系，17—20 冲突处理，21—24 团队协作，25—28 情绪表达，29—32 休息与生活偏好。第 25—32 题的具体题干需跨场景综合，不重复前 24 题的问法。

- [ ] **Step 3: 将介绍和计分配置更新为 32 题与末 8 题策略**

把 intro 中的题数改为 32，并把 scoring 改成：

~~~ts
scoring: {
  type: 'archetype',
  reports: ['chiikawa', 'hachiware', 'usagi', 'rakko', 'kurimanju', 'momonga', 'kaiman', 'shisa'],
  tieBreak: { type: 'recent-answers', window: 8 },
},
~~~

meta.minutes 保持 6，notice、八个报告和 resultLabel 保持原口径；不得引入诊断、筛查、治疗等临床词。

- [ ] **Step 4: 运行 Chiikawa 契约测试确认变绿**

运行：

~~~powershell
npm --prefix miniapp run test -- src/domain/tests/chiikawaBondTest.test.ts
~~~

预期：四个契约测试全部通过；若失败，优先修正角色矩阵或文案，不放宽测试断言。

- [ ] **Step 5: 运行注册表 sanity 回归**

运行：

~~~powershell
npm --prefix miniapp run test -- src/config/testRegistrySanity.test.ts
~~~

预期：Chiikawa 仍在注册表稳定顺序中，所有报告可达，文案合规检查通过。

- [ ] **Step 6: 提交题库内容和聚焦契约**

~~~powershell
git add miniapp/src/domain/tests/chiikawaBondTest.ts miniapp/src/domain/tests/chiikawaBondTest.test.ts
git commit -m "将 Chiikawa 测试改为三十二题四选一"
~~~

## Task 5: 更新功能文档和题库说明

**Files:**
- Modify: docs/features/test-engine.md
- Modify: docs/features/test-content-tarot-share.md

- [ ] **Step 1: 更新通用测试引擎文档**

在 docs/features/test-engine.md 的 archetype 说明中补充：TestScoring.archetype.tieBreak 可选，recent-answers 只在总票平局时统计末窗口，archetypeVotes 仍展示全部题目原始票数；把“22 个测试”更新为当前“29 个测试”，并在题库扩量段落列出 Chiikawa 32 题四选一。

文档应使用以下明确口径：

~~~md
Chiikawa 缘分测试：32 题、每题 4 个短选项、八角色曝光与位置平衡；总票平局时用末 8 题做二次判定，仍平局才按定义顺序兜底。
~~~

- [ ] **Step 2: 更新测试内容清单**

在 docs/features/test-content-tarot-share.md 中把过期的“17 测试清单”更新为当前注册表的 29 项，并在趣味扩批次下注明 chiikawa-bond 的 32 × 4 结构和娱乐向声明；不要修改塔罗迁移、COS loader 或分享流程的历史记录。

- [ ] **Step 3: 运行文档相关 sanity 测试**

运行：

~~~powershell
npm --prefix miniapp run test -- src/config/testRegistrySanity.test.ts src/domain/testEngine.test.ts src/domain/tests/chiikawaBondTest.test.ts
~~~

预期：三组测试全部通过，文档内容与代码中题数/平票配置一致。

- [ ] **Step 4: 提交文档**

~~~powershell
git add docs/features/test-engine.md docs/features/test-content-tarot-share.md
git commit -m "更新 Chiikawa 题库与 archetype 文档"
~~~

## Task 6: 全量验证、构建和预览

**Files:**
- No additional source files; verify the committed implementation.

- [ ] **Step 1: 运行全部 Vitest**

运行：

~~~powershell
npm test
~~~

预期：命令退出码为 0；报告中包含 testEngine、chiikawaBondTest、注册表 sanity，且无与本任务相关的失败。若存在任务开始前就有的无关失败，记录测试名和原始输出，不把它们归因于本任务。

- [ ] **Step 2: 构建微信小程序**

运行：

~~~powershell
npm run build:weapp
~~~

预期：退出码为 0，miniapp/dist 重新生成，无 TypeScript、Taro 或 WXSS 编译错误。

- [ ] **Step 3: 检查题库和构建产物**

运行：

~~~powershell
rg -n "24 道|24题|32 道|32题|tieBreak|recent-answers" miniapp/src/domain/tests/chiikawaBondTest.ts miniapp/src/domain/testEngine.ts docs/features/test-engine.md docs/features/test-content-tarot-share.md
Get-Item miniapp/dist | Select-Object FullName,LastWriteTime
~~~

预期：Chiikawa 源码/文档只保留 32 题口径，平票配置为末 8 题；构建目录时间为本次构建时间。

- [ ] **Step 4: 在微信开发者工具清缓存预览**

导入 D:\\Mine\\PtKing-miniapp\\miniapp，执行“清缓存 → 重新编译”，从测试中心打开 Chiikawa 测试并人工确认：

1. 进度显示从 1/32 到 32/32。
2. 每题只出现 4 张纵向选项卡，长文案不出现八选项挤压。
3. 选择、返回修改、继续答题草稿、完成报告和历史记录回看均正常。
4. 报告页仍展示八角色票数分布，平票结果不会崩溃或显示空报告。
5. 其他测试的二选项/多选项布局和报告没有回归。

注意：本任务不上传 COS，也不把题目内容复制到新的主包资产；动态 registry 仍按现有热更协议工作。

- [ ] **Step 5: 最终范围检查**

运行：

~~~powershell
git status --short --branch
git diff HEAD~3..HEAD --stat
~~~

确认最近任务提交只包含本计划列出的引擎、Chiikawa 题库/测试和两份功能文档；工作区中其他原有未提交改动仍未被 stage 或回退。

## 自审清单

- 题库结构覆盖：32 题、4 选项、八角色总曝光/位置/末窗口平衡、角色对共现差 ≤1、选项短且不泄露角色名，由 Task 3 和 Task 4 覆盖。
- 计分行为覆盖：总票胜出、末窗口解平、末窗口继续平局定义顺序兜底、旧测试无配置时不变、原始票数分布不变，由 Task 1 和 Task 2 覆盖。
- 页面/数据流覆盖：答题页与报告页无新增分支，构建和开发者工具预览由 Task 6 覆盖。
- 文档覆盖：通用引擎能力、29 项注册表和 Chiikawa 32 × 4 口径由 Task 5 覆盖。
- 未使用 TBD、TODO、FIXME 或未定义函数名；所有实现步骤给出目标文件、测试命令、预期结果和提交范围。
