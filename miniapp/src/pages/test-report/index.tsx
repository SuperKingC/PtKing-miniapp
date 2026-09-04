import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { findBandIndex, radarChartGeometry } from '../../domain/testEngine'
import { trackEvent } from '../../services/monitor'
import { renderShareCard } from '../../services/reportShareCard'
import { showRewardedAd } from '../../services/rewardedAd'
import { getTestDefinition } from '../../services/testRegistry'
import { buildHistoryRows, loadTestRecords, unlockRecord, type TestRecord } from '../../services/testRecords'
import './index.scss'

// 报告页（高级感版式）：hero 结果卡（主报告+tagline+徽章）→ 模式化图表区 → 摘要/解读卡。
// 图表随计分模式切换：
// - dimension：双端字母+百分比标注的维度条（MBTI）
// - factor：canvas 雷达图 + 百分位条（大五/暗黑）
// - archetype：人格倾向分布横条 + 次人格卡（票数占比来自引擎 archetypeVotes，旧记录无该字段时整体隐藏）
// - band：三档分数刻度条（高亮所在档）+ 得分徽章
// 报告数据取该测试的本地记录（默认最新一次；?finishedAt= 精确回看某一次，答题页落库后 redirect 过来必有记录）。
// 变现：新完成的报告 locked=true，看激励视频解锁正文；广告位未配置或 SDK 异常时直接解锁（不阻断主链路）。
// M4 分享：结果型标题 + canvas 预生成的 5:4 结果卡片图（生成失败回退默认截图）

interface FactorScore {
  id: string
  label: string
  percent: number
}

/** 雷达图绘制（ctx 注入便于复用）：环网格 + 轴线 + 数据多边形 + 顶点圆点，几何来自 domain 纯函数；取色随主题 */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scores: FactorScore[],
  dark: boolean,
): void {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(cx, cy) * 0.74
  const gridColor = dark ? 'rgba(224, 138, 92, 0.22)' : 'rgba(192, 95, 53, 0.16)'
  const lineColor = dark ? '#e08a5c' : '#c05f35'
  // 归一化几何（center 0.5 / radius 0.38）映射到画布像素空间
  const normalized = radarChartGeometry(scores.length)
  const points = normalized.map((point) => ({
    x: cx + (point.x - 0.5) * (radius / 0.38),
    y: cy + (point.y - 0.5) * (radius / 0.38),
  }))

  // 背景网格：4 层同心多边形环 + 轴线
  ctx.strokeStyle = gridColor
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

  // 数据多边形：品牌色半透明填充 + 实线描边 + 顶点圆点
  ctx.beginPath()
  scores.forEach((score, index) => {
    const vertex = points[index]
    const x = cx + (vertex.x - cx) * (score.percent / 100)
    const y = cy + (vertex.y - cy) * (score.percent / 100)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = dark ? 'rgba(224, 138, 92, 0.24)' : 'rgba(192, 95, 53, 0.2)'
  ctx.fill()
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = lineColor
  scores.forEach((score, index) => {
    const vertex = points[index]
    const x = cx + (vertex.x - cx) * (score.percent / 100)
    const y = cy + (vertex.y - cy) * (score.percent / 100)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
}

function formatDateLabel(iso: string): string {
  try {
    return iso.slice(5, 10).replaceAll('-', '.')
  } catch {
    return iso
  }
}

export default function TestReportPage() {
  const router = useRouter()
  const definition = useMemo(() => getTestDefinition(router.params.testId ?? ''), [router.params.testId])

  // 该测试全部历史（新→旧）：?finishedAt= 指定时精确回看那一次，否则展示最新一次
  const history = useMemo(
    () => (definition ? loadTestRecords().filter((item) => item.testId === definition.id) : []),
    [definition],
  )
  const record = useMemo((): TestRecord | null => {
    const finishedAt = router.params.finishedAt
    if (finishedAt) {
      const hit = history.find((item) => item.finishedAt === finishedAt)
      if (hit) return hit
    }
    return history[0] ?? null
  }, [history, router.params.finishedAt])

  // 激励视频解锁：新完成的报告 locked=true，看完广告才展示完整内容；
  // 广告位未配置或 SDK 异常时 showRewardedAd 返回 unavailable，同样直接解锁（降级不阻断）
  const [adUnlocked, setAdUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const locked = record?.locked === true && !adUnlocked

  const handleUnlock = async () => {
    if (!record || unlocking) return
    setUnlocking(true)
    try {
      const outcome = await showRewardedAd()
      trackEvent('report_unlock', { testId: definition?.id ?? '', outcome })
      if (outcome === 'aborted') {
        wx.showToast({ title: '看完视频才能解锁报告哦', icon: 'none' })
      } else {
        unlockRecord(record.testId, record.finishedAt)
        setAdUnlocked(true)
      }
    } finally {
      setUnlocking(false)
    }
  }

  // 报告漏斗：进入报告页（带解锁状态，可算完测→解锁→分享转化）
  useEffect(() => {
    if (definition && record) {
      trackEvent('report_view', { testId: definition.id, locked: record.locked === true })
    }
  }, [definition, record])

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

  // 暗色模式：跟随系统主题（画布取色在 JS，无法用 CSS 变量）
  const [darkTheme, setDarkTheme] = useState(() => {
    try {
      return Taro.getSystemInfoSync().theme === 'dark'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      const handler = (res: { theme?: string }) => setDarkTheme(res?.theme === 'dark')
      Taro.onThemeChange?.(handler)
      return () => {
        Taro.offThemeChange?.(handler)
      }
    } catch {
      return undefined
    }
  }, [])

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
        drawRadar(ctx, width, height, radarScores, darkTheme)
      })
  }, [radarScores, darkTheme])

  // 分享卡片：报告就绪即预生成 5:4 卡片图（隐藏 canvas → 临时文件），转发时作 imageUrl
  const [shareImagePath, setShareImagePath] = useState('')
  useEffect(() => {
    if (!definition || !record) return
    const sharedReport = definition.reports[record.result.reportId]
    if (!sharedReport) return
    let cancelled = false
    renderShareCard('share-card-canvas', {
      testTitle: definition.title,
      resultTitle: sharedReport.title,
      tagline: sharedReport.tagline,
    }).then((path) => {
      if (!cancelled) setShareImagePath(path)
    })
    return () => {
      cancelled = true
    }
  }, [definition, record])

  // 好友转发：结果型标题（不剧透具体题目）+ 结果卡片图 + 直达该测试详情页引导开测
  useShareAppMessage(() => {
    const report = definition && record ? definition.reports[record.result.reportId] : null
    trackEvent('report_share', { testId: definition?.id ?? '' })
    return {
      title: report
        ? `我在 ${definition!.title} 里测出了「${report.title}」，你也来试试`
        : 'PtKing · 来测测你的隐藏人格',
      path: definition ? `/pages/test-detail/index?testId=${definition.id}` : undefined,
      imageUrl: shareImagePath || undefined,
    }
  })

  // 朋友圈分享：单页模式打开，仅带结果型标题
  useShareTimeline(() => {
    const report = definition && record ? definition.reports[record.result.reportId] : null
    return {
      title: report
        ? `我在 ${definition!.title} 里测出了「${report.title}」`
        : 'PtKing · 来测测你的隐藏人格',
      imageUrl: shareImagePath || undefined,
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

  // ===== 解锁门：锁定记录不渲染报告正文，只给 hero 预告 + 解锁卡 =====
  if (locked) {
    return (
      <View className="test-report">
        <View className="test-report__hero">
          <Text className="test-report__eyebrow">{definition.title} · 你的报告</Text>
          <Text className="test-report__type">报告已生成</Text>
          <Text className="test-report__tagline">你的人格结果已就绪，看完一小段视频即可解锁</Text>
        </View>
        <View className="test-report__gate">
          <Text className="test-report__gate-title">解锁完整报告</Text>
          <Text className="test-report__gate-desc">
            包含结果摘要、类型解读、深度解读、优势盲区、场景适配与行动清单。
          </Text>
          <View
            className="test-report__gate-btn"
            hoverClass="none"
            onClick={() => {
              void handleUnlock()
            }}
          >
            <Text>{unlocking ? '正在打开视频…' : '观看视频解锁'}</Text>
          </View>
          <Text className="test-report__gate-note">视频由微信广告提供，看完自动解锁</Text>
        </View>
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

  // 历史对比：多测同测试时展示本次 + 往前最多 3 次，band 模式带与上一次的分差
  const historyRows = buildHistoryRows(history)

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

      {historyRows.length > 1 && (
        <View className="test-report__panel">
          <Text className="test-report__panel-title">历史对比 · 共 {history.length} 次</Text>
          {historyRows.map((row) => (
            <View
              key={row.record.finishedAt}
              className="test-report__history-row"
              hoverClass="none"
              onClick={() => {
                wx.redirectTo({
                  url: `/pages/test-report/index?testId=${definition.id}&finishedAt=${encodeURIComponent(row.record.finishedAt)}`,
                })
              }}
            >
              <Text className="test-report__history-attempt">第 {row.attempt} 次</Text>
              <Text className="test-report__history-title">
                {definition.reports[row.record.result.reportId]?.title ?? row.record.resultTitle ?? row.record.result.reportId}
              </Text>
              <Text className="test-report__history-date">{formatDateLabel(row.record.finishedAt)}</Text>
              {typeof row.record.result.bandScore === 'number' && (
                <Text className="test-report__history-score">{row.record.result.bandScore} 分</Text>
              )}
              {row.delta !== null && row.delta !== 0 && (
                <Text
                  className={
                    row.delta > 0
                      ? 'test-report__history-delta test-report__history-delta--up'
                      : 'test-report__history-delta test-report__history-delta--down'
                  }
                >
                  {row.delta > 0 ? `▲+${row.delta}` : `▼${row.delta}`}
                </Text>
              )}
            </View>
          ))}
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
      <Button className="test-report__share" openType="share" hoverClass="none">
        分享给好友
      </Button>
      <View
        className="test-report__back"
        hoverClass="none"
        onClick={() => {
          wx.switchTab({ url: '/pages/test/index' })
        }}
      >
        <Text>回到测试中心</Text>
      </View>
      {/* 分享卡片绘制专用隐藏画布（5:4，导出临时图后由微信转存），不参与页面展示 */}
      <canvas type="2d" id="share-card-canvas" className="test-report__share-canvas" />
    </View>
  )
}
