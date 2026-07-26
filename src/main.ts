import './style.css'
import { Game } from './core/Game'

const app = document.getElementById('app')!
const game = new Game(app)

// QC 훅 — tools/qc.mjs 가 플레이어 화면 좌표와 진행 상태를 읽어
// 확대 캡처와 단계 판정에 쓴다. 게임 동작에는 영향이 없다.
;(window as unknown as { __game: Game }).__game = game
