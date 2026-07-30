import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

export interface DropdownAnchor {
  top: number;
  left: number;
  width: number;
}

export function useDropdown<TKey extends string>() {
  const [activeDropdown, setActiveDropdown] = useState<TKey | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const anchorsRef = useRef<Partial<Record<TKey, View | null>>>({});

  const registerAnchorRef = useCallback(
    (key: TKey) => (node: View | null) => {
      anchorsRef.current[key] = node;
    },
    []
  );

  const open = useCallback((key: TKey) => {
    const node = anchorsRef.current[key];
    node?.measureInWindow((x, y, width, height) => {
      const dropdownWidth = Math.max(width, 190);
      const left = Math.max(8, x + width - dropdownWidth);
      setDropdownAnchor({ top: y + height + 4, left, width: dropdownWidth });
      setActiveDropdown(key);
    });
  }, []);

  const close = useCallback(() => {
    setActiveDropdown(null);
    setDropdownAnchor(null);
  }, []);

  return {
    activeDropdown,
    dropdownAnchor,
    registerAnchorRef,
    open,
    close,
  };
}
