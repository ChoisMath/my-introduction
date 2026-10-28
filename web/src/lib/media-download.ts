import { isUploadablePath } from './volume';

// 내려받기 허용 경로 = 업로드 허용 경로. 새 목록을 따로 두면 두 목록이 어긋나 비공개 파일이 열릴 수 있으므로,
// 업로드 라우트가 쓰는 허용 목록을 그대로 재사용한다(private/members.json 같은 회원 데이터는 목록에 없어 거부된다).
export function downloadablePath(rel: string): boolean {
  return isUploadablePath(rel);
}
