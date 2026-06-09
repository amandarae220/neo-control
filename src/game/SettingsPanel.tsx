import type { RefObject } from 'react';

type Props = {
  panelRef:        RefObject<HTMLDivElement | null>;
  cheatSectionRef: RefObject<HTMLDivElement | null>;
  cheatInputRef:   RefObject<HTMLInputElement | null>;
  cheatStatusRef:  RefObject<HTMLParagraphElement | null>;
  onCheatSubmit:   () => void;
};

export default function SettingsPanel({
  panelRef, cheatSectionRef, cheatInputRef, cheatStatusRef, onCheatSubmit,
}: Props) {
  const toggleCheat = () => {
    if (!cheatSectionRef.current) return;
    const open = cheatSectionRef.current.style.display !== 'none';
    cheatSectionRef.current.style.display = open ? 'none' : 'flex';
    if (!open) cheatInputRef.current?.focus();
  };

  const close = () => {
    if (panelRef.current) panelRef.current.style.display = 'none';
  };

  return (
    <div ref={panelRef} className="settings-panel" style={{ display: 'none' }}>
      <p className="settings-title">— SETTINGS —</p>
      <button className="settings-item" onClick={toggleCheat}>CHEAT CODES</button>
      <div ref={cheatSectionRef} className="cheat-section" style={{ display: 'none' }}>
        <div className="cheat-row">
          <input
            ref={cheatInputRef}
            className="cheat-input"
            placeholder="ENTER CODE"
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            aria-label="Cheat code"
          />
          <button className="cheat-go-btn" onClick={onCheatSubmit}>GO</button>
        </div>
        <p ref={cheatStatusRef} className="cheat-status" />
      </div>
      <button className="settings-item settings-close" onClick={close}>CLOSE</button>
    </div>
  );
}
