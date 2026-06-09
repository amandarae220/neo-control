import type { RefObject } from 'react';

type Props = {
  overlayRef:      RefObject<HTMLDivElement>;
  scoreRef:        RefObject<HTMLOutputElement>;
  loadingRef:      RefObject<HTMLParagraphElement>;
  rankAlertRef:    RefObject<HTMLDivElement>;
  nameSectionRef:  RefObject<HTMLDivElement>;
  inputRef:        RefObject<HTMLInputElement>;
  randomRef:       RefObject<HTMLButtonElement>;
  submitRef:       RefObject<HTMLButtonElement>;
  boardRef:        RefObject<HTMLDivElement>;
  listRef:         RefObject<HTMLOListElement>;
  retryRef:        RefObject<HTMLButtonElement>;
};

export default function LeaderboardOverlay({
  overlayRef, scoreRef, loadingRef, rankAlertRef, nameSectionRef,
  inputRef, randomRef, submitRef, boardRef, listRef, retryRef,
}: Props) {
  return (
    <div
      ref={overlayRef}
      className="lb-overlay"
      style={{ display: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game over — leaderboard"
    >
      <div className="lb-modal">
        <div className="lb-main">
          <h2 className="lb-header">GAME OVER</h2>

          <div className="lb-score-block">
            <output ref={scoreRef} className="lb-score-value">0</output>
            <p className="lb-label">FINAL SCORE</p>
          </div>

          <p ref={loadingRef} className="lb-loading" style={{ display: 'none' }}>
            CHECKING LEADERBOARD…
          </p>

          <div ref={rankAlertRef} className="lb-rank-alert" style={{ display: 'none' }}>
            <span className="lb-rank-alert-icon" aria-hidden="true">▲</span>
            <span className="lb-rank-alert-text">NEW LEADERBOARD ENTRY</span>
          </div>

          <div ref={nameSectionRef} className="lb-name-section" style={{ display: 'none' }}>
            <input
              ref={inputRef}
              id="lb-callsign-input"
              className="lb-input"
              maxLength={12}
              placeholder="NOVA WOLF"
              autoComplete="off"
              spellCheck={false}
              aria-label="Your callsign"
            />
            <button ref={randomRef} className="lb-random-btn" type="button">
              <span aria-hidden="true">↻ </span>Generate callsign
            </button>
            <button ref={submitRef} className="lb-submit-btn">SUBMIT SCORE</button>
          </div>

          <div ref={boardRef} className="lb-board" style={{ display: 'flex' }}>
            <p className="lb-label">TOP PILOTS</p>
            <ol ref={listRef} className="lb-list" />
          </div>
        </div>

        <div className="lb-footer">
          <button ref={retryRef} className="lb-retry-btn" aria-label="Play again">
            <span aria-hidden="true">► </span>INSERT COIN TO CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
