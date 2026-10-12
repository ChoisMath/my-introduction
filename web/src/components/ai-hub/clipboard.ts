// 권한 팝업을 막았거나 http 로컬 환경이면 clipboard API 가 거부되어 textarea 방식으로 대신한다.
export async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
