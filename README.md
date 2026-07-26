# LinkZip

React와 Firebase로 만든 프로필 링크·콘텐츠 블록 서비스입니다. Google 로그인, 온보딩,
프로필 편집, 공개 페이지, 방명록, 고객정보 수집, 방문·클릭 통계를 제공합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

검증 명령은 다음과 같습니다.

```bash
npm run lint
npm test
npm run build
```

계좌 실명 인증 기능을 사용하려면 비밀키를 보유한 별도 백엔드를 준비하고
`.env.example`을 참고해 `VITE_ACCOUNT_VERIFICATION_ENDPOINT`를 설정해야 합니다.
비밀키를 `VITE_` 환경 변수나 브라우저 코드에 넣으면 안 됩니다.

## 데이터 구조

```text
users/{uid}                              소유자 전용 설정
publicProfiles/{uid}                     공개 가능한 프로필 데이터
usernames/{lowercaseUsername}            username → uid 인덱스
users/{uid}/collected_customer_data      고객정보 수집 결과
analytics/{uid}                          조회수 합계
analytics/{uid}/daily/{yyyy-mm-dd}       일별 조회·클릭
analytics/{uid}/links/{linkId}           링크별 클릭
guestbooks/{entryId}                     공개 방명록
```

기존 `users/{uid}` 데이터는 사용자가 로그인하면 공개 프로필과 username 인덱스가
자동으로 생성됩니다.

## 코드 구조

- `src/pages`: 라우트 단위 화면
- `src/components/admin`: 관리자 편집 UI
- `src/components/LinkTreePreview.tsx`: 공개/관리자 공용 미리보기
- `src/store/useStore.ts`: 편집 상태와 undo/redo
- `src/services`: Firebase와 외부 API 접근
- `src/domain`: 부작용 없는 데이터 변환 로직
- `firestore.rules`, `storage.rules`: Firebase 보안 규칙
- `tests`: 핵심 데이터 변환 테스트

Firebase 배포 전에 프로젝트 환경에 맞게 규칙을 검토한 뒤 다음처럼 배포합니다.

```bash
firebase deploy --only firestore:rules,storage,hosting
```
