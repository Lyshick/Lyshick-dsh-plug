/**
 * Offline checks for the parts of dsh-spec-inspect that can be tested without
 * a Harness process: index normalization, document decoding, and prompt shape.
 *
 *   node plugins/dsh-spec-inspect/_selftest.mjs
 */
import assert from 'node:assert/strict'
import { normalizeIndex, documentText, buildPrompt, parseReport, buildFixPrompt, userMessage } from './index.js'

function zipStore(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(0, 10)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBytes, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const centralStart = offset
  const centralBytes = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20)
  return { buffer: Buffer.concat([...locals, centralBytes, eocd]), size: centralStart }
}

let passed = 0
function check(name, fn) {
  fn()
  passed++
  console.log(`ok - ${name}`)
}

check('canonical channels + relative document URL', () => {
  const index = normalizeIndex({
    channels: [{
      id: 'web',
      name: 'Web 渠道',
      docs: [{ id: 'html-style', title: 'HTML 编写规范', url: './default-skill.md' }],
    }],
  }, 'https://spec.example.com/index.json')
  assert.equal(index.channels.length, 1)
  assert.equal(index.channels[0].id, 'web')
  assert.equal(index.channels[0].docs[0].url, 'https://spec.example.com/default-skill.md')
  assert.equal(index.channels[0].docs[0].type, 'md')
})

check('top-level document array becomes a default channel', () => {
  const index = normalizeIndex([
    'https://spec.example.com/a.md',
    { title: 'Word 规范', url: 'https://spec.example.com/b.doc' },
  ], 'https://spec.example.com/index.json')
  assert.equal(index.channels.length, 1)
  assert.equal(index.channels[0].name, '默认渠道')
  assert.equal(index.channels[0].docs.length, 2)
  assert.equal(index.channels[0].docs[1].type, 'doc')
})

check('channels object map is accepted', () => {
  const index = normalizeIndex({
    channels: {
      web: { name: 'Web', documents: [{ title: '规范', path: '/specs/web.md' }] },
      app: { name: 'App', files: [{ title: '规范', href: 'https://spec.example.com/app.docx' }] },
    },
  }, 'https://spec.example.com/index.json')
  assert.deepEqual(index.channels.map((channel) => channel.name), ['Web', 'App'])
  assert.equal(index.channels[0].docs[0].url, 'https://spec.example.com/specs/web.md')
  assert.equal(index.channels[1].docs[0].type, 'docx')
})

check('markdown and HTML become readable text', () => {
  assert.match(documentText(Buffer.from('# 标题\n正文'), 'md'), /# 标题/)
  const html = documentText(Buffer.from('<html><body><h1>标题</h1><script>x()</script><p>正文 &amp; 说明</p></body></html>'), 'html')
  assert.match(html, /标题/)
  assert.match(html, /正文 & 说明/)
  assert.doesNotMatch(html, /<h1>/)
})

check('docx paragraphs are extracted from a zip', () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>第一段</w:t></w:r></w:p><w:p><w:r><w:t>第二段</w:t></w:r></w:p></w:body></w:document>'
  const zip = zipStore({ 'word/document.xml': xml })
  const text = documentText(zip.buffer, 'docx')
  assert.equal(text, '第一段\n第二段')
})

check('prompt carries the document and the P0-P5 contract', () => {
  const prompt = buildPrompt({
    channel: 'Web 渠道',
    doc: { id: 'html-style', title: 'HTML 编写规范', url: 'https://spec.example.com/html-style.md' },
    text: 'P0 阻断问题；P5 建议。',
  })
  assert.match(prompt, /HTML 编写规范/)
  assert.match(prompt, /P0-P5/)
  assert.match(prompt, /只做检视，不修改任何文件/)
  assert.match(prompt, /规范依据/)
})

check('report parser extracts level groups, locations, and fixes', () => {
  const report = parseReport([
    '## 检视结论',
    '发现 2 个 P1。',
    '',
    '## P0 问题',
    '无',
    '',
    '## P1 问题',
    '',
    '- 分类：代码 bug 检视（第一部分）',
    '- 级别：P1',
    '- 位置：`js/game.js:124-140`（checkMatches 内）',
    '- 问题：级联消除被重复结算。',
    '- 原因：每个棋子各挂一个定时器。',
    '- 规范依据：第一部分「异步时序问题」。',
    '- 风险：分数虚高。',
    '- 修复建议：整批消除只调度一次结算。',
    '',
    '- 位置：`js/game.js:65-70`',
    '- 问题：交换合法性判定不完整。',
    '- 修复建议：补充边界判定。',
    '',
    '## 级别汇总',
    '| 级别 | 数量 |',
    '| P1 | 2 |',
    '',
    '## 待确认',
    '无',
  ].join('\n'))
  assert.ok(report !== undefined)
  assert.equal(report.conclusion, '发现 2 个 P1。')
  assert.deepEqual(report.groups.map((group) => group.level), ['P0', 'P1'])
  const p1 = report.groups[1].items
  assert.equal(p1.length, 2)
  assert.equal(p1[0].path, 'js/game.js')
  assert.equal(p1[0].line, 124)
  assert.equal(p1[0].endLine, 140)
  assert.equal(p1[0].fix, '整批消除只调度一次结算。')
  assert.equal(p1[1].line, 65)
  assert.equal(p1[1].fix, '补充边界判定。')
  assert.equal(report.groups[0].items.length, 0)
})

check('report parser ignores text that is not an inspection report', () => {
  assert.equal(parseReport('这是一段普通的回答，没有任何级别标题。'), undefined)
  const bold = parseReport('### **P2 问题**\n\n- **位置**：`src/a.vue:3`\n- **问题**：缺少 key。\n- **修复建议**：补 key。')
  assert.equal(bold.groups[0].level, 'P2')
  assert.equal(bold.groups[0].items[0].line, 3)
})

check('fix prompt targets one location and demands a scoped edit', () => {
  const prompt = buildFixPrompt({
    path: 'js/game.js',
    line: 124,
    endLine: 140,
    issue: '级联消除被重复结算。',
    basis: '异步时序问题',
    fix: '整批消除只调度一次结算。',
  })
  assert.match(prompt, /js\/game\.js:124-140/)
  assert.match(prompt, /整批消除只调度一次结算/)
  assert.match(prompt, /只做必要修改/)
  assert.throws(() => buildFixPrompt({ path: 'a.js', line: 1 }), /没有可应用的修复建议/)
  assert.throws(() => buildFixPrompt({ fix: 'x' }), /缺少有效的文件路径/)
})

check('followup message carries id and role so Chat renders it', () => {
  const message = userMessage('hello')
  assert.equal(message.role, 'user')
  assert.match(message.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  assert.deepEqual(message.content, [{ type: 'text', text: 'hello' }])
  assert.deepEqual(message.source, { kind: 'user' })
})

console.log(`\n${passed} checks passed`)
