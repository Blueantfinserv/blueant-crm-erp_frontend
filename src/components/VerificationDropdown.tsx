import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Platform, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

type Option = { value: string; label: string };
type Props = {
  label: string; value: string; options: readonly Option[];
  onChange: (value: string) => void; disabled?: boolean;
};

export function VerificationDropdown(props: Props) {
  if (Platform.OS === 'web') return <WebVerificationDropdown {...props} />;
  return <View style={{ flex: 1, minWidth: 0 }}><Picker accessibilityLabel={props.label} enabled={!props.disabled} selectedValue={props.value} onValueChange={(value) => props.onChange(String(value))} style={{ height: 40, minWidth: 0 }}>{props.options.map((option) => <Picker.Item key={option.value} value={option.value} label={option.label} />)}</Picker></View>;
}

function WebVerificationDropdown({ label, value, options, onChange, disabled }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [active, setActive] = useState(0);
  const selected = options.findIndex((option) => option.value === value);
  const typeahead = useRef({ text: '', time: 0 });
  const close = (restoreFocus = true) => {
    setPosition(null);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const measure = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportHeight = window.innerHeight;
    const below = Math.max(0, viewportHeight - rect.bottom - 14);
    const above = Math.max(0, rect.top - 14);
    const desired = Math.min(240, options.length * 38 + 8);
    const useAbove = below < desired && above > below;
    const height = Math.min(desired, useAbove ? above : below);
    const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 16);
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: useAbove ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
      width, height,
    });
  };
  const open = () => {
    if (disabled) return;
    setActive(selected >= 0 ? selected : 0);
    measure();
  };
  const isOpen = position !== null;
  useEffect(() => {
    if (!isOpen) return;
    list.current?.focus({ preventScroll: true });
    const reposition = (event: Event) => {
      if (event.target instanceof Node && list.current?.contains(event.target)) return;
      measure();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen, options.length]);
  useEffect(() => {
    if (isOpen) list.current?.querySelector<HTMLElement>('[data-index="' + active + '"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, isOpen]);
  useEffect(() => { if (disabled) setPosition(null); }, [disabled]);
  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };
  return <>
    <style>{dropdownCss}</style>
    <button ref={trigger} type="button" className="ba-verification-select" aria-label={label} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} disabled={disabled}
      onClick={() => isOpen ? close() : open()}
      onKeyUp={(event) => { if (event.key === 'Escape') event.stopPropagation(); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
        if (event.key === 'Escape') close();
      }}>
      <span>{options[selected]?.label ?? options[0]?.label ?? ''}</span>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {position ? createPortal(
      <div className="ba-verification-select-layer" onMouseDown={() => close()}>
        <div ref={list} id={id} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={id + '-' + active}
          className="ba-verification-select-menu" style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.height }}
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(false); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
            else if (event.key === 'Tab') close();
            else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, options.length - 1)); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
            else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
            else if (event.key === 'End') { event.preventDefault(); setActive(options.length - 1); }
            else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); }
            else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
              const now = Date.now();
              const text = (now - typeahead.current.time < 700 ? typeahead.current.text : '') + event.key.toLowerCase();
              typeahead.current = { text, time: now };
              const index = options.findIndex((option) => option.label.toLowerCase().startsWith(text));
              if (index >= 0) { event.preventDefault(); setActive(index); }
            }
          }}>
          {options.map((option, index) => <div key={option.value} id={id + '-' + index} data-index={index} role="option" aria-selected={option.value === value}
            className={'ba-verification-select-option' + (index === active ? ' is-active' : '') + (option.value === value ? ' is-selected' : '')}
            onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
            <span>{option.label}</span>{option.value === value ? <span aria-hidden="true">?</span> : null}
          </div>)}
        </div>
      </div>, trigger.current?.closest('[aria-modal="true"]') ?? document.body) : null}
  </>;
}

const dropdownCss = `
.ba-verification-select { box-sizing:border-box; width:100%; min-width:0; height:40px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 10px; border:1px solid #D5E1F1; border-radius:9px; background:#fff; color:#1E3353; font-family:inherit; font-size:12px; text-align:left; cursor:pointer; }
.ba-verification-select > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ba-verification-select svg { flex-shrink:0; color:#647793; }
.ba-verification-select:hover { border-color:#9DB7E4; }
.ba-verification-select:focus-visible { outline:2px solid #2563EB; outline-offset:1px; }
.ba-verification-select:disabled { background:#EFF3F8; color:#8693A8; cursor:not-allowed; }
.ba-verification-select-layer { position:fixed; inset:0; z-index:2147483200; }
.ba-verification-select-menu { box-sizing:border-box; position:fixed; overflow-y:auto; overscroll-behavior:contain; padding:4px; border:1px solid #D7E3F3; border-radius:11px; background:#fff; color:#1E3353; box-shadow:0 8px 28px rgba(20,44,84,.18); outline:none; font-family:Arial,sans-serif; scrollbar-width:thin; scrollbar-color:#B6C9E3 #F3F7FC; }
.ba-verification-select-option { box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:38px; padding:9px 10px; border-radius:7px; font-size:12px; line-height:18px; cursor:pointer; overflow-wrap:anywhere; }
.ba-verification-select-option.is-active { background:#EFF5FF; }
.ba-verification-select-option.is-selected { color:#1D4ED8; background:#E5EFFF; font-weight:600; }
`;
