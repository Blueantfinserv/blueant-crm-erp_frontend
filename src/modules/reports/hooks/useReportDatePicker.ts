import { useCallback } from 'react';
import { DateRange } from '../reportPreview/types';

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReportRange(from?: Date, to?: Date) {
  if (!from || !to) return 'Custom';
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(from)} - ${fmt(to)}`;
}

export function useReportDatePicker() {
  const openNativeDatePicker = useCallback((initialDate: Date, onPick: (date: Date | null) => void) => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    let disposed = false;
    input.type = 'date';
    input.value = formatInputDate(initialDate);
    input.style.position = 'fixed';
    input.style.left = '50%';
    input.style.top = '32%';
    input.style.width = '260px';
    input.style.height = '40px';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.opacity = '0';
    input.style.pointerEvents = 'auto';
    input.style.zIndex = '9999';
    input.style.border = '0';
    input.style.padding = '0';

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      input.removeEventListener('change', handleChange);
      input.removeEventListener('blur', handleBlur);
      input.remove();
    };

    const handleChange = () => {
      const picked = input.value ? new Date(`${input.value}T00:00:00`) : null;
      cleanup();
      onPick(picked);
    };

    const handleBlur = () => {
      if (!input.value) {
        cleanup();
        onPick(null);
      }
    };

    input.addEventListener('change', handleChange);
    input.addEventListener('blur', handleBlur);
    document.body.appendChild(input);
    input.focus();

    const nativeInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof nativeInput.showPicker === 'function') {
      nativeInput.showPicker();
    } else {
      nativeInput.click();
    }
  }, []);

  const openCustomRangePicker = useCallback(
    (range: DateRange, onSelectRange: (range: DateRange) => void) => {
      openNativeDatePicker(range.from, (pickedFrom) => {
        if (!pickedFrom) {
          return;
        }

        openNativeDatePicker(range.to, (pickedTo) => {
          const toCandidate = pickedTo ?? range.to;
          const fromDate = pickedFrom <= toCandidate ? pickedFrom : toCandidate;
          const toDate = pickedFrom <= toCandidate ? toCandidate : pickedFrom;
          onSelectRange({ from: fromDate, to: toDate });
        });
      });
    },
    [openNativeDatePicker]
  );

  return {
    openCustomRangePicker,
  };
}
