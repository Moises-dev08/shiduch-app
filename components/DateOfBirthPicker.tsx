import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './DateOfBirthPicker.styles';

interface DateOfBirthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
  error?: string;
}

const MONTHS: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDate(
  year: number,
  monthIndex: number,
  day: number,
  minDate: Date,
  maxDate: Date,
): Date {
  const maxDay = daysInMonth(year, monthIndex);
  const next = new Date(year, monthIndex, Math.min(day, maxDay));
  if (next > maxDate) return maxDate;
  if (next < minDate) return minDate;
  return next;
}

export default function DateOfBirthPicker({
  value,
  onChange,
  minDate,
  maxDate,
  error,
}: DateOfBirthPickerProps): React.ReactElement {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const years = useMemo((): number[] => {
    const list: number[] = [];
    for (let y = maxDate.getFullYear(); y >= minDate.getFullYear(); y -= 1) {
      list.push(y);
    }
    return list;
  }, [minDate, maxDate]);

  const days = useMemo((): number[] => {
    const count = daysInMonth(year, month);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [year, month]);

  const apply = (nextYear: number, nextMonth: number, nextDay: number): void => {
    onChange(clampDate(nextYear, nextMonth, nextDay, minDate, maxDate));
  };

  const dropdowns = (
    <View style={styles.row}>
      <View style={styles.field}>
        <Text style={styles.label}>Month</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={String(month)}
            onValueChange={(itemValue) => apply(year, Number(itemValue), day)}
            style={styles.picker}
          >
            {MONTHS.map((monthName, index) => (
              <Picker.Item key={monthName} label={monthName} value={String(index)} />
            ))}
          </Picker>
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Day</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={String(day)}
            onValueChange={(itemValue) => apply(year, month, Number(itemValue))}
            style={styles.picker}
          >
            {days.map((dayNumber) => (
              <Picker.Item
                key={dayNumber}
                label={String(dayNumber)}
                value={String(dayNumber)}
              />
            ))}
          </Picker>
        </View>
      </View>
      <View style={styles.fieldYear}>
        <Text style={styles.label}>Year</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={String(year)}
            onValueChange={(itemValue) => apply(Number(itemValue), month, day)}
            style={styles.picker}
          >
            {years.map((yearNumber) => (
              <Picker.Item
                key={yearNumber}
                label={String(yearNumber)}
                value={String(yearNumber)}
              />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {dropdowns}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowNativePicker(true)}
      >
        <Text style={styles.dateText}>{value.toLocaleDateString()}</Text>
        <Ionicons name="calendar" size={20} color="#666" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showNativePicker}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowNativePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select date of birth</Text>
              <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.nativePickerContainer}>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    onChange(selectedDate);
                  }
                }}
                maximumDate={maxDate}
                minimumDate={minDate}
                style={styles.nativePicker}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showNativePicker && (
          <DateTimePicker
            value={value}
            mode="date"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowNativePicker(false);
              if (selectedDate) {
                onChange(selectedDate);
              }
            }}
            maximumDate={maxDate}
            minimumDate={minDate}
          />
        )
      )}
    </View>
  );
}
