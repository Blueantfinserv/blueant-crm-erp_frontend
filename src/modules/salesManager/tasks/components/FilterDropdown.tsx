import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { styles } from '../salesManagerTasksStyles';

type DropdownProps<T extends string> = {
  value: T;
  options: readonly T[];
  compactWidth?: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

const taskFilterLabel = (value: string) => value === 'Today'
  ? "Today's Task"
  : value === 'Leads'
    ? 'Prospects'
    : value;

export function FilterDropdown<T extends string>({
  value,
  options,
  compactWidth,
  open,
  onToggle,
  onSelect,
  accessibilityLabel,
}: DropdownProps<T>) {
  return (
    <View style={[styles.dropdownRoot, compactWidth && styles.dropdownRootCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.dropdownButton, open && styles.dropdownButtonOpen, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.dropdownValue}>{taskFilterLabel(value)}</Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={19} color={theme.colors.muted} />
      </Pressable>

      {open ? (
        <ScrollView
          style={styles.dropdownMenu}
          contentContainerStyle={styles.dropdownMenuContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{taskFilterLabel(option)}</Text>
                {selected ? <Icon source="check" size={17} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
