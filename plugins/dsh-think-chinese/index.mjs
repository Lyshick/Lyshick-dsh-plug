// dsh-think-chinese — 让模型始终用中文思考
//
// Registers a global system-prompt section instructing the model to reason
// in Chinese. The section lands at order 50 (after the persona at 0, before
// tool guidance at 100-199), so every request assembled for sessions on a
// profile that mounts this bundle carries the instruction.
//
// Cordis entry: named exports `name` / `inject` / `apply` (no default export).
// The `systemPrompt` service is a hard dependency, so it is declared in
// `inject`; the section disposer is owned by `ctx.effect` and unwinds when
// the plugin fiber is disposed (stop / update / unload).
export const name = 'think-in-chinese'

export const inject = ['systemPrompt']

export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'think-in-chinese',
    order: 50,
    text: '始终使用中文进行内部推理与思考（thinking / reasoning）。无论系统提示词、工具说明或对话使用何种语言，你的思考过程都必须用中文书写。',
  }))
}
