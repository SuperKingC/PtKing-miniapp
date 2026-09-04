import { useEffect, useMemo } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { findBandIndex, radarChartGeometry } from '../../domain/testEngine'
import { getTestDefinition } from '../../services/testRegistry'
import { loadTestRecords } from '../../services/testRecords'
import './index.scss'

// 报告页（高级感版式）：hero 结果卡（主报告+tagline+徽章）→ 模式化图表区 → 摘要/解读卡。
// 图表随计分模式切换：
// - dimension：双端字母+百分比标注的维度条（MBTI）
// - factor：canvas 雷达图 + 百分位条（大五/暗黑）
// - archetype：人格倾向分布横条 + 次人格卡（票数占比来自引擎 archetypeVotes，旧记录无该字段时整体隐藏）
// - band：三档分数刻度条（高亮所在档）+ 得分徽章
// 报告数据取最近一次该测试的本地记录（答题页落库后 redirect 过来，必有记录）。
// M4 分享：报告页转发给好友时带结果型标题（不剧透具体答案内容）

interface FactorScore {
  id: string
  label: string
  percent: number
}

/** 雷达图绘制（ctx 注入便于复用）：环网格 + 轴线 + 数据多边形 + 顶点圆点，几何来自 domain 纯函数 */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scores: FactorScore[],
): void {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(cx, cy) * 0.74
  // 归一化几何（center 0.5 / radius 0.38）映射到画布像素空间
  const normalized = radarChartGeometry(scores.length)
  const points = normalized.map((point) => ({
    x: cx + (point.x - 0.5) * (radius / 0.38),
    y: cy + (point.y - 0.5) * (radius / 0.38),
  }))

  // 背景网格：4 层同心多边形环 + 轴线
  ctx.strokeStyle = 'rgba(192, 95, 53, 0.16)'
  ctx.lineWidth = 1
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath()
    points.forEach((point, index) => {
      const x = cx + (point.x - cx) * (ring / 4)
      const y = cy + (point.y - cy) * (ring / 4)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()
  }
  for (const point of points) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  // 数据多边形：陶土橘半透明填充 + 实线描边 + 顶点圆点
  ctx.beginPath()
  scores.forEach((score, index) => {
    const vertex = points[index]
    const x = cx + (vertex.x - cx) * (score.percent / 100)
    const y = cy + (vertex.y - cy) * (score.percent / 100)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(192, 95, 53, 0.2)'
  ctx.fill()
  ctx.strokeStyle = '#c05f35'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#c05f35'
  scores.forEach((score, index) => {
    const vertex = points[index]
    const x = cx + (vertex.x - cx) * (score.percent / 100)
    const y = cy + (vertex.y - cy) * (score.percent / 100)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
}

export default function TestReportPage() {
  const router = useRouter()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])

  const record = useMemo(() => {
    if (!definition) return null
    return loadTestRecords().find((item) => item.testId === definition.id) ?? null
  }, [definition])

  const factorScores = record?.result.factorScores ?? []

  // archetype 票数分布（旧记录无该字段 → null；全 0 票防御 → null 走纯文字兜底）
  const votes = useMemo(() => {
    const raw = record?.result.archetypeVotes
    if (!raw) return null
    const total = raw.reduce((sum, item) => sum + item.count, 0)
    return total > 0 ? { list: raw, total } : null
  }, [record])

  // 雷达数据统一来源：factor 模式用因素百分位，archetype 模式用票数占比，其余模式无雷达
  const radarScores = useMemo(() => {
    if (factorScores.length >= 3) return factorScores
    if (votes && votes.list.length >= 3) {
      return votes.list.map((vote) => ({
        id: vote.reportId,
        label: definition?.reports[vote.reportId]?.title ?? vote.reportId,
        percent: Math.round((vote.count / votes.total) * 100),
      }))
    }
    return []
  }, [factorScores, votes, definition])

  // factor/archetype 模式雷达图：weapp canvas 2d 节点须经 createSelectorQuery 获取（ref 拿不到原生 node）
  useEffect(() => {
    if (radarScores.length < 3) return
    const query = Taro.createSelectorQuery()
    query
      .select('#report-radar')
      .fields({ node: true, size: true })
      .exec((res) => {
        const { node, width, height } = res?.[0] ?? {}
        if (!node || !width || !height) return
        const dpr = Taro.getSystemInfoSync().pixelRatio || 2
        node.width = width * dpr
        node.height = height * dpr
        const ctx = node.getContext('2d')
        ctx.scale(dpr, dpr)
        drawRadar(ctx, width, height, radarScores)
      })
  }, [radarScores])

  useShareAppMessage(() => {
    const report = definition && record ? definition.reports[record.result.reportId] : null
    return {
      title: report
        ? `我在 ${definition!.title} 里测出了「${report.title}」，你也来试试`
        : 'PtKing · 来测测你的隐藏人格',
    }
  })

  if (!definition || !record) {
    return (
      <View className="test-report">
        <Text className="test-report__missing">还没有该测试的报告，先去完成一次测试吧。</Text>
        <View
          className="test-report__action"
          hoverClass="none"
          onClick={() => {
            wx.switchTab({ url: '/pages/test/index' })
          }}
        >
          <Text>去测试中心</Text>
        </View>
      </View>
    )
  }

  const report = definition.reports[record.result.reportId]
  if (!report) {
    return (
      <View className="test-report">
        <Text className="test-report__missing">报告数据缺失，请重新测试。</Text>
      </View>
    )
  }

  const bandScore = record.result.bandScore
  const bandIndex = bandScore !== null ? findBandIndex(definition, bandScore) : null
  const bands = definition.scoring.type === 'band' ? definition.scoring.bands : []
  const bandLabels = bands.map((band) => definition.reports[band.reportId]?.title ?? band.reportId)

  // 次人格：票数第二高且 ≥1 票（并列按定义序取先）
  let runnerUp: { title: string; tagline: string; count: number } | null = null
  if (votes && votes.list.length > 1) {
    const sorted = [...votes.list].sort((a, b) => b.count - a.count)
    const second = sorted[1]
    const secondReport = second && second.count > 0 ? definition.reports[second.reportId] : null
    if (second && secondReport) {
      runnerUp = { title: secondReport.title, tagline: secondReport.tagline, count: second.count }
    }
  }

  return (
    <View className="test-report">
      <View className="test-report__hero">
        <Text className="test-report__eyebrow">{definition.title} · 你的报告</Text>
        <Text className="test-report__type">{report.title}</Text>
        <Text className="test-report__tagline">{report.tagline}</Text>
        <View className="test-report__hero-badges">
          <View className="test-report__badge">
            <Text>{definition.meta.minutes} 分钟</Text>
          </View>
          <View className="test-report__badge">
            <Text>{definition.questions.length} 题</Text>
          </View>
          <View className="test-report__badge">
            <Text>{definition.category}向</Text>
          </View>
        </View>
      </View>

      {record.result.dimensionScores.length > 0 && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">维度倾向</Text>
          {record.result.dimensionScores.map((dim) => {
            const [leftLabel, rightLabel] = dim.label.split(' ↔ ')
            const leaningLeft = dim.percent >= 50
            return (
              <View key={dim.id} className="test-report__dim">
                <View className="test-report__dim-head">
                  <Text className={leaningLeft ? 'test-report__dim-side test-report__dim-side--on' : 'test-report__dim-side'}>
                    {leftLabel} {dim.percent}%
                  </Text>
                  <Text className={!leaningLeft ? 'test-report__dim-side test-report__dim-side--on' : 'test-report__dim-side'}>
                    {rightLabel} {100 - dim.percent}%
                  </Text>
                </View>
                <View className="test-report__dim-track">
                  <View className="test-report__dim-fill" style={{ width: `${dim.percent}%` }} />
                </View>
              </View>
            )
          })}
        </View>
      )}

      {factorScores.length >= 3 && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">因素雷达</Text>
          <View className="test-report__radar-wrap">
            <canvas type="2d" id="report-radar" className="test-report__radar" />
          </View>
          <View className="test-report__factor-list">
            {factorScores.map((factor) => (
              <View key={factor.id} className="test-report__factor-row">
                <Text className="test-report__factor-label">{factor.label}</Text>
                <View className="test-report__factor-track">
                  <View className="test-report__factor-fill" style={{ width: `${factor.percent}%` }} />
                </View>
                <Text className="test-report__factor-value">{factor.percent}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {votes && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">人格倾向分布</Text>
          {votes.list.length >= 3 && (
            <View className="test-report__radar-wrap">
              <canvas type="2d" id="report-radar" className="test-report__radar" />
            </View>
          )}
          {votes.list.map((vote) => {
            const percent = Math.round((vote.count / votes.total) * 100)
            const isTop = vote.reportId === record.result.reportId
            return (
              <View key={vote.reportId} className="test-report__vote-row">
                <Text className={isTop ? 'test-report__vote-label test-report__vote-label--on' : 'test-report__vote-label'}>
                  {definition.reports[vote.reportId]?.title ?? vote.reportId}
                </Text>
                <View className="test-report__vote-track">
                  <View className="test-report__vote-fill" style={{ width: `${percent}%` }} />
                </View>
                <Text className="test-report__vote-value">{percent}%</Text>
              </View>
            )
          })}
          {runnerUp && (
            <View className="test-report__runner">
              <Text className="test-report__runner-chip">次人格</Text>
              <Text className="test-report__runner-title">{runnerUp.title}（{runnerUp.count} 票）</Text>
              <Text className="test-report__runner-tagline">{runnerUp.tagline}——你身上也藏着这一面。</Text>
            </View>
          )}
        </View>
      )}

      {bandScore !== null && bands.length > 0 && bandIndex !== null && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">分数刻度</Text>
          <View className="test-report__band-score">
            <Text className="test-report__band-value">{bandScore}</Text>
            <Text className="test-report__band-unit">分 · {bandLabels[bandIndex]}</Text>
          </View>
          <View className="test-report__band-scale">
            {bands.map((band, index) => (
              <View
                key={band.reportId}
                className={index === bandIndex ? 'test-report__band-seg test-report__band-seg--on' : 'test-report__band-seg'}
              >
                <Text className="test-report__band-seg-label">{bandLabels[index]}</Text>
                <Text className="test-report__band-seg-range">{band.min}-{band.max} 分</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="test-report__panel">
        <Text className="test-report__panel-title">结果摘要</Text>
        <Text className="test-report__summary">{report.summary}</Text>
      </View>

      <View className="test-report__panel">
        <Text className="test-report__panel-title">类型解读</Text>
        {report.detail.map((line) => (
          <View key={line.slice(0, 10)} className="test-report__detail-item">
            <Text className="test-report__detail-dot">·</Text>
            <Text className="test-report__detail-text">{line}</Text>
          </View>
        ))}
      </View>

      {report.deep && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">深度解读</Text>
          <Text className="test-report__summary">{report.deep}</Text>
        </View>
      )}

      {report.strengths && report.blindSpots && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">优势与盲区</Text>
          <Text className="test-report__subhead test-report__subhead--on">你的三大优势</Text>
          {report.strengths.map((line) => (
            <View key={line.slice(0, 10)} className="test-report__detail-item">
              <Text className="test-report__detail-dot">+</Text>
              <Text className="test-report__detail-text">{line}</Text>
            </View>
          ))}
          <Text className="test-report__subhead test-report__subhead--off">你的三个盲区</Text>
          {report.blindSpots.map((line) => (
            <View key={line.slice(0, 10)} className="test-report__detail-item">
              <Text className="test-report__detail-dot">!</Text>
              <Text className="test-report__detail-text">{line}</Text>
            </View>
          ))}
        </View>
      )}

      {report.scenes && report.scenes.length > 0 && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">场景适配</Text>
          {report.scenes.map((item) => (
            <View key={item.scene} className="test-report__scene">
              <Text className="test-report__scene-chip">{item.scene}</Text>
              <Text className="test-report__scene-text">{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {report.actions && report.actions.length > 0 && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">行动清单</Text>
          {report.actions.map((line, index) => (
            <View key={line.slice(0, 10)} className="test-report__action-item">
              <Text className="test-report__action-num">{index + 1}</Text>
              <Text className="test-report__detail-text">{line}</Text>
            </View>
          ))}
        </View>
      )}

      <View
        className="test-report__action"
        hoverClass="none"
        onClick={() => {
          wx.redirectTo({ url: `/pages/test-play/index?testId=${definition.id}` })
        }}
      >
        <Text>再测一次</Text>
      </View>
      <View
        className="test-report__back"
        hoverClass="none"
        onClick={() => {
          wx.switchTab({ url: '/pages/test/index' })
        }}
      >
        <Text>回到测试中心</Text>
      </View>
    </View>
  )
}
