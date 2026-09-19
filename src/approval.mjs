import {applyRetryGuard} from './retry-guard.mjs';
export const name = 'second-agent-approval';
export function approvalReason(exec) {
  const args = exec.arguments ?? {};
  if (exec.name === 'browser_interact' && args.action !== 'hover')
    return '瀏覽器互動可能送出網站資料。請核對此次具體操作後批准；瀏覽器讀取不需批准。';
  if (exec.name === 'browser_tabs' && args.action === 'borrow')
    return '此操作將接管使用者既有分頁，請確認。';
  if (/^(bash|shell|exec_command|terminal)$/.test(exec.name)) {
    const command = String(args.command ?? args.cmd ?? '');
    if (/\b(git\s+push|gh\s+(?:pr\s+(?:merge|create|comment)|issue\s+(?:create|comment)|release\s+create)|npm\s+publish|curl\b.*(?:-X\s*(?:POST|PUT|DELETE|PATCH)|--data|-d\s)|rm\s+[^\n]*-[^\n]*r[^\n]*f)\b/i.test(command))
      return '此命令可能發布、發送資料或不可逆刪除。請先確認本次命令與目標。';
  }
}
export function apply(ctx) {
  applyRetryGuard(ctx);
  ctx.on('tools/pre-execute', async (exec, next) => {
    const downstream = await next();
    if (downstream.kind !== 'allow') return downstream;
    const reason = approvalReason(exec);
    return reason ? {kind:'ask',reason} : downstream;
  });
}
