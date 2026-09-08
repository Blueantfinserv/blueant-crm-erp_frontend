import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Icon } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

const LEAD_SOURCES = ["Referral", "Website", "Walk-in", "Other"];
const MEETING_MODES = ["Physical", "Virtual"];
const JOINED_WITH_OPTIONS = ["Alone", "With Someone"];
const LEAD_STATUSES = [
  "Work In Progress",
  "Converted as Client",
  "Client Not Interested",
  "Remove This Client",
  "Already Blueant Client",
];
const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const getClientSideAddress = async (latitude, longitude) => {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query.toString()}`);
  if (!response.ok) throw new Error("Reverse geocoding failed");
  const place = await response.json();
  const localityEntries = [
    ...(place.localityInfo?.informative ?? []),
    ...(place.localityInfo?.administrative ?? []),
  ];
  const specificLocalities = localityEntries
    .filter((entry) => {
      const name = String(entry?.name ?? "");
      const description = String(entry?.description ?? "");
      return /sector|block|phase|ward|colony|industrial area|neighbou?rhood|suburb|quarter|locality/i.test(`${name} ${description}`);
    })
    .map((entry) => entry.name)
    .filter(Boolean)
    .slice(0, 2);

  return [...specificLocalities, place.locality, place.localityName, place.city, place.principalSubdivision, place.postcode, place.countryName]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
};

export default function LeadWorkflowForm({ type, lead, onClose, onSubmit }) {
  const isNewLead = type === "new-lead";
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewedMonth, setViewedMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    number: lead?.phone ?? "",
    leadSource: "",
    remarks: "",
    locationText: lead?.locationText ?? "",
    meetingMode: "",
    meetingDate: getLocalDate(),
    leadStatus: "",
    joinedWith: "Alone",
    nextPlanDate: "",
    liveLocation: null,
    cardImage: null,
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);

  useEffect(() => {
    if (!submissionSuccess) return undefined;
    const timer = setTimeout(onClose, 1000);
    return () => clearTimeout(timer);
  }, [onClose, submissionSuccess]);

  const title = useMemo(() => {
    if (isNewLead) return "New Lead";
    return "Meeting Update";
  }, [isNewLead]);
  const subtitle = isNewLead
    ? "Capture a fresh opportunity in a few quick steps"
    : "Keep the client journey updated and moving forward";

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmissionError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (isNewLead) {
      if (!form.name.trim()) nextErrors.name = "Name is required.";
      if (!/^\+?[\d\s-]{10,}$/.test(form.number.trim())) nextErrors.number = "Valid number is required.";
      if (!form.leadSource) nextErrors.leadSource = "Lead source is required.";
      if (!form.remarks.trim()) nextErrors.remarks = "Remarks are required.";
      if (!form.locationText.trim()) nextErrors.locationText = "Location is required.";
    } else {
      if (lead?.taskKind === "MEETING" && !lead?.meetingCode) {
        nextErrors.meetingCode = "No active meeting is available for this lead.";
      }
      if (!form.meetingMode) nextErrors.meetingMode = "Meeting mode is required.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.meetingDate)) {
        nextErrors.meetingDate = "Use date format YYYY-MM-DD.";
      }
      if (!form.leadStatus) nextErrors.leadStatus = "Lead status is required.";
      if (!form.joinedWith) nextErrors.joinedWith = "Joined With is required.";
      if (!form.remarks.trim()) nextErrors.remarks = "Remarks are required.";
      if (!form.liveLocation) nextErrors.liveLocation = "Live location is required.";
      if (!form.cardImage) nextErrors.cardImage = "Card image is required.";
      if (form.leadStatus === "Work In Progress" && !form.nextPlanDate) {
        nextErrors.nextPlanDate = "Next plan date is required.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const captureLiveLocation = async () => {
    if (fetchingLocation) return;
    setFetchingLocation(true);
    setSubmissionError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Please allow location access to capture your live meeting location.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;
      let address = "Address could not be resolved";
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          address = place.formattedAddress || [
            place.name,
            place.streetNumber && place.street ? `${place.streetNumber} ${place.street}` : place.street,
            place.district,
            place.subregion,
            place.city,
            place.region,
            place.postalCode,
            place.country,
          ]
            .filter(Boolean)
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(", ") || address;
        }
      } catch {
        // The native reverse geocoder is not available on web and can occasionally fail on devices.
      }
      if (address === "Address could not be resolved") {
        try {
          const clientSideAddress = await getClientSideAddress(latitude, longitude);
          if (clientSideAddress) address = clientSideAddress;
        } catch {
          // Coordinates remain available if both address providers are unavailable.
        }
      }
      update("liveLocation", { latitude, longitude, address, accuracy: position.coords.accuracy });
    } catch {
      Alert.alert("Location unavailable", "Could not fetch the current location. Please turn on location services and try again.");
    } finally {
      setFetchingLocation(false);
    }
  };

  const captureCardImage = async () => {
    if (openingCamera) return;
    setOpeningCamera(true);
    setSubmissionError("");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Camera permission needed", "Please allow camera access to capture the visiting card.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) update("cardImage", result.assets[0]);
    } catch {
      Alert.alert("Camera unavailable", "Could not open the camera. Please try again.");
    } finally {
      setOpeningCamera(false);
    }
  };

  const submit = async () => {
    if (submittingRef.current) return;
    if (!validate()) return;
    const meetingPayload = {
      leadId: lead?.uniqueLeadId,
      meetingCode: lead?.meetingCode,
      meetingMode: form.meetingMode,
      meetingDate: form.meetingDate,
      leadStatus: form.leadStatus,
      aloneWith: form.joinedWith === "Alone" ? "SELF" : "SOMEONE",
      remarks: form.remarks.trim(),
      nextPlanDate: form.leadStatus === "Work In Progress" ? form.nextPlanDate : "",
      latitude: form.liveLocation?.latitude,
      longitude: form.liveLocation?.longitude,
      address: form.liveLocation?.address,
      accuracy: form.liveLocation?.accuracy,
      cardImage: form.cardImage,
    };

    const createLeadRequest = {
      clientName: form.name.trim(),
      mobileNumber: form.number.replace(/\D/g, ""),
      location: form.locationText.trim(),
      leadSource: form.leadSource.trim().toUpperCase().replace(/[\s-]+/g, "_"),
      remarks: form.remarks.trim(),
    };

    setSubmissionError("");
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const successMessage = await onSubmit?.(isNewLead ? createLeadRequest : meetingPayload);
      setSubmissionSuccess(successMessage || (isNewLead ? "Lead created successfully." : "Meeting submitted successfully."));
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
          ? error.message
          : isNewLead ? "Lead creation failed." : "Meeting submission failed.";
      setSubmissionError(errorMessage);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const showNextPlanDate = form.leadStatus === "Work In Progress";

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#172554", "#3730A3", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerGlowLarge} />
        <View style={styles.headerGlowSmall} />
        <View style={styles.headerCopy}>
          <View style={styles.headerIcon}>
            <Icon
              source={isNewLead ? "account-plus-outline" : "calendar-check-outline"}
              size={22}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{isNewLead ? "Lead creation" : lead?.taskLabel}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close form" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.formCardHeading}>
              <View style={styles.formCardIcon}>
                <Icon source={isNewLead ? "account-details-outline" : "clipboard-text-outline"} size={17} color="#2563EB" />
              </View>
              <View style={styles.formCardHeadingCopy}>
                <Text style={styles.formCardTitle}>{isNewLead ? "Lead Information" : "Meeting Information"}</Text>
                <Text style={styles.formCardCaption}>Fields marked with * are required</Text>
              </View>
            </View>
          {isNewLead ? (
            <>
              <Field label="Name" required error={errors.name}>
                <Input value={form.name} onChangeText={(value) => update("name", value)} placeholder="Client name" />
              </Field>
              <Field label="Number" required error={errors.number}>
                <Input
                  value={form.number}
                  onChangeText={(value) => update("number", value)}
                  keyboardType="phone-pad"
                  placeholder="Mobile number"
                />
              </Field>
              <Field label="Lead Source" required error={errors.leadSource}>
                <Select value={form.leadSource} options={LEAD_SOURCES} onChange={(value) => update("leadSource", value)} />
              </Field>
              <Field label="Remarks" required error={errors.remarks}>
                <Input
                  value={form.remarks}
                  onChangeText={(value) => update("remarks", value)}
                  multiline
                  style={styles.textarea}
                  placeholder="Add remarks"
                />
              </Field>
              <Field label="Location" required error={errors.locationText}>
                <Input
                  value={form.locationText}
                  onChangeText={(value) => update("locationText", value)}
                  placeholder="Area, city or complete address"
                />
              </Field>
            </>
          ) : (
            <>
              <View style={styles.autofillCard}>
                <View style={styles.autofillItem}>
                  <Text style={styles.autofillLabel}>Client</Text>
                  <Text style={styles.autofillValue}>{form.name}</Text>
                </View>
                <View style={styles.autofillItem}>
                  <Text style={styles.autofillLabel}>Number</Text>
                  <Text style={styles.autofillValue}>{form.number}</Text>
                </View>
              </View>

              {errors.meetingCode ? <Text style={styles.error}>{errors.meetingCode}</Text> : null}
              <Field label="Meeting Mode" required error={errors.meetingMode}>
                <Select value={form.meetingMode} options={MEETING_MODES} onChange={(value) => update("meetingMode", value)} />
              </Field>
              <Field label="Meeting Date" required error={errors.meetingDate}>
                <Input value={form.meetingDate} onChangeText={(value) => update("meetingDate", value)} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="Lead Status" required error={errors.leadStatus}>
                <Select value={form.leadStatus} options={LEAD_STATUSES} onChange={(value) => update("leadStatus", value)} />
              </Field>
              <Field label="Joined With" required error={errors.joinedWith}>
                <ChoiceGroup value={form.joinedWith} options={JOINED_WITH_OPTIONS} onChange={(value) => update("joinedWith", value)} />
              </Field>
              <Field label="Remarks" required error={errors.remarks}>
                <Input
                  value={form.remarks}
                  onChangeText={(value) => update("remarks", value)}
                  multiline
                  style={styles.textarea}
                  placeholder="Meeting remarks"
                />
              </Field>

              <Field label="Live Location" required error={errors.liveLocation}>
                <Pressable
                  disabled={fetchingLocation}
                  onPress={() => void captureLiveLocation()}
                  style={({ pressed }) => [styles.captureBox, pressed && styles.pressed]}
                >
                  <View style={[styles.captureIcon, form.liveLocation && styles.captureIconSuccess]}>
                    {fetchingLocation
                      ? <ActivityIndicator size="small" color="#2563EB" />
                      : <Icon source={form.liveLocation ? "map-marker-check" : "crosshairs-gps"} size={20} color={form.liveLocation ? "#047857" : "#2563EB"} />}
                  </View>
                  <View style={styles.captureCopy}>
                    <View style={styles.locationTitleRow}>
                      <Text style={styles.captureTitle}>{fetchingLocation ? "Fetching live location..." : form.liveLocation ? "Live location" : "Capture current location"}</Text>
                      {form.liveLocation ? (
                        <View style={styles.verifiedBadge}>
                          <View style={styles.verifiedDot} />
                          <Text style={styles.verifiedText}>VERIFIED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={2} style={styles.captureDescription}>
                      {form.liveLocation?.address ?? "Tap to fetch latitude, longitude and address"}
                    </Text>
                    {form.liveLocation ? (
                      <View style={styles.coordinateRow}>
                        <View style={styles.coordinateChip}>
                          <Text style={styles.coordinateLabel}>LAT</Text>
                          <Text style={styles.coordinateText}>{form.liveLocation.latitude.toFixed(6)}</Text>
                        </View>
                        <View style={styles.coordinateChip}>
                          <Text style={styles.coordinateLabel}>LONG</Text>
                          <Text style={styles.coordinateText}>{form.liveLocation.longitude.toFixed(6)}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.locationAction}>
                    <Icon source={form.liveLocation ? "refresh" : "chevron-right"} size={18} color="#4F46E5" />
                  </View>
                </Pressable>
              </Field>

              <Field label="Visiting Card Image" required error={errors.cardImage}>
                <Pressable
                  disabled={openingCamera}
                  onPress={() => void captureCardImage()}
                  style={({ pressed }) => [styles.cameraBox, pressed && styles.pressed]}
                >
                  {form.cardImage?.uri ? <Image source={{ uri: form.cardImage.uri }} style={styles.cardPreview} /> : (
                    <View style={styles.cameraPlaceholder}>
                      {openingCamera
                        ? <ActivityIndicator size="small" color="#7C3AED" />
                        : <Icon source="camera-outline" size={26} color="#7C3AED" />}
                    </View>
                  )}
                  <View style={styles.captureCopy}>
                    <Text style={styles.captureTitle}>{openingCamera ? "Opening camera..." : form.cardImage ? "Card image captured" : "Take card photo"}</Text>
                    <Text style={styles.captureDescription}>{form.cardImage ? "Tap to retake using camera" : "Camera only — gallery selection is disabled"}</Text>
                  </View>
                  <Icon source="camera" size={19} color="#7C3AED" />
                </Pressable>
              </Field>

              {showNextPlanDate ? (
                <Field label="Next Plan Date" required error={errors.nextPlanDate}>
                  <Pressable style={styles.dateInput} onPress={() => setDatePickerOpen(true)}>
                    <View style={styles.dateIcon}>
                      <Icon source="calendar-month-outline" size={18} color="#6D28D9" />
                    </View>
                    <View style={styles.dateCopy}>
                      <Text style={styles.dateCaption}>Choose follow-up date</Text>
                      <Text style={form.nextPlanDate ? styles.inputText : styles.placeholder}>
                        {form.nextPlanDate
                          ? new Intl.DateTimeFormat("en-IN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }).format(new Date(`${form.nextPlanDate}T00:00:00`))
                          : "Tap to open calendar"}
                      </Text>
                    </View>
                    <Icon source="chevron-right" size={19} color="#A78BFA" />
                  </Pressable>
                  {datePickerOpen ? (
                    <CompactCalendar
                      viewedMonth={viewedMonth}
                      selectedDate={form.nextPlanDate}
                      onChangeMonth={setViewedMonth}
                      onSelect={(value) => {
                        update("nextPlanDate", value);
                        setDatePickerOpen(false);
                      }}
                    />
                  ) : null}
                </Field>
              ) : null}

            </>
          )}
          </View>

          {submissionError ? (
            <Text style={styles.error}>{submissionError}</Text>
          ) : null}

          <Pressable disabled={submitting} onPress={() => void submit()} style={({ pressed }) => [styles.submitPressable, pressed && styles.pressed]}>
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submit}
            >
              <View style={styles.submitIcon}>
                {submitting
                  ? <ActivityIndicator size="small" color="#5B21B6" />
                  : <Icon source={isNewLead ? "account-check-outline" : "check-bold"} size={17} color="#5B21B6" />}
              </View>
              <Text style={styles.submitText}>{isNewLead ? "Create Lead" : "Submit Update"}</Text>
              <View style={styles.submitArrow}>
                <Icon source="arrow-right" size={16} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {submissionSuccess ? (
        <View style={styles.successOverlay}>
          <View style={styles.successIcon}>
            <Icon source="check-bold" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{isNewLead ? "Lead Created" : "Meeting Updated"}</Text>
          <Text style={styles.successMessage}>{submissionSuccess}</Text>
        </View>
      ) : null}

    </View>
  );
}

function CompactCalendar({ viewedMonth, selectedDate, onChangeMonth, onSelect }) {
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const leadingDays = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? null : index - leadingDays + 1
  );
  while (cells.length % 7) cells.push(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoBack = viewedMonth > firstAllowedMonth;
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(viewedMonth);

  return (
    <View style={styles.compactCalendar}>
      <View style={styles.calendarHeader}>
        <Pressable
          disabled={!canGoBack}
          onPress={() => onChangeMonth(new Date(year, month - 1, 1))}
          style={[styles.calendarArrow, !canGoBack && styles.calendarArrowDisabled]}
        >
          <Icon source="chevron-left" size={17} color={canGoBack ? "#6D28D9" : "#CBD5E1"} />
        </Pressable>
        <Text style={styles.calendarMonth}>{monthLabel}</Text>
        <Pressable
          onPress={() => onChangeMonth(new Date(year, month + 1, 1))}
          style={styles.calendarArrow}
        >
          <Icon source="chevron-right" size={17} color="#6D28D9" />
        </Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
        ))}
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
          const date = new Date(year, month, day);
          const disabled = date < today;
          const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const selected = value === selectedDate;
          return (
            <Pressable
              key={value}
              disabled={disabled}
              onPress={() => onSelect(value)}
              style={[styles.calendarCell, selected && styles.calendarCellSelected]}
            >
              <Text style={[
                styles.calendarDay,
                disabled && styles.calendarDayDisabled,
                selected && styles.calendarDaySelected,
              ]}>
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field({ label, required, error, last, children }) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : <Text style={styles.optional}> (optional)</Text>}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Input({ style, ...props }) {
  return <TextInput placeholderTextColor="#94A3B8" style={[styles.input, style]} {...props} />;
}

function Select({ value, options, onChange }) {
  return (
    <View style={styles.select}>
      <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
        <Picker.Item label="Select an option" value="" />
        {options.map((option) => <Picker.Item key={option} label={option} value={option} />)}
      </Picker>
    </View>
  );
}

function ChoiceGroup({ value, options, onChange }) {
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected]}>
          <View style={[styles.radio, value === option && styles.radioSelected]} />
          <Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    minHeight: 112, paddingHorizontal: 24, paddingVertical: 20, overflow: "hidden",
  },
  headerGlowLarge: {
    position: "absolute", width: 180, height: 180, right: -48, top: -92,
    borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)",
  },
  headerGlowSmall: {
    position: "absolute", width: 88, height: 88, right: 92, bottom: -58,
    borderRadius: 44, backgroundColor: "rgba(196,181,253,0.16)",
  },
  headerCopy: { minWidth: 0, flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 48, height: 48, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerText: { minWidth: 0, flex: 1 },
  eyebrow: { color: "#DDD6FE", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, textTransform: "uppercase" },
  title: { marginTop: 3, color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.45 },
  subtitle: { marginTop: 3, maxWidth: 360, color: "#E0E7FF", fontSize: 10, lineHeight: 15, fontWeight: "600" },
  close: {
    width: 34, height: 34, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  closeText: { color: "#FFFFFF", fontSize: 25, lineHeight: 27 },
  content: { padding: 20, paddingBottom: 32 },
  formCard: {
    padding: 22, borderWidth: 1, borderColor: "#E8EAF3", borderRadius: 20,
    backgroundColor: "#FFFFFF", shadowColor: "#312E81", shadowOpacity: 0.07,
    shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 3,
  },
  formCardHeading: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18,
    paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: "#EEF2F7",
  },
  formCardIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#EEF2FF" },
  formCardHeadingCopy: { flex: 1 },
  formCardTitle: { color: "#1E1B4B", fontSize: 14, fontWeight: "900" },
  formCardCaption: { marginTop: 2, color: "#94A3B8", fontSize: 9, fontWeight: "600" },
  field: { marginBottom: 16 },
  fieldLast: { marginBottom: 0 },
  label: { marginBottom: 8, color: "#37334F", fontSize: 11, fontWeight: "900", letterSpacing: 0.15 },
  required: { color: "#EF4444" },
  optional: { color: "#94A3B8", fontWeight: "600" },
  input: {
    width: "100%", minHeight: 45, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E3E2EE", borderRadius: 13,
    backgroundColor: "#FBFAFF", color: "#1E1B4B", fontSize: 14,
  },
  inputText: { color: "#0F172A", fontSize: 14 },
  placeholder: { color: "#94A3B8", fontSize: 14 },
  dateInput: {
    minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1,
    borderColor: "#DDD6FE", borderRadius: 13, backgroundColor: "#FAF8FF",
  },
  dateIcon: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 11, backgroundColor: "#EDE9FE",
  },
  dateCopy: { minWidth: 0, flex: 1 },
  dateCaption: { marginBottom: 2, color: "#7C3AED", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  compactCalendar: {
    alignSelf: "center", width: "82%", marginTop: 8, padding: 10,
    borderWidth: 1, borderColor: "#E9D5FF", borderRadius: 13,
    backgroundColor: "#FFFFFF", shadowColor: "#4C1D95", shadowOpacity: 0.1,
    shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  calendarArrow: { width: 27, height: 27, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#F5F3FF" },
  calendarArrowDisabled: { backgroundColor: "#F8FAFC" },
  calendarMonth: { color: "#312E81", fontSize: 11, fontWeight: "900" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekDay: { width: "14.285%", paddingVertical: 3, color: "#A78BFA", fontSize: 8, fontWeight: "900", textAlign: "center" },
  calendarCell: { width: "14.285%", height: 27, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  calendarCellSelected: { backgroundColor: "#7C3AED" },
  calendarDay: { color: "#334155", fontSize: 9, fontWeight: "700" },
  calendarDayDisabled: { color: "#D6D3E3" },
  calendarDaySelected: { color: "#FFFFFF", fontWeight: "900" },
  textarea: { minHeight: 86, textAlignVertical: "top" },
  followupInput: { marginTop: 9 },
  select: { minHeight: 45, justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "#E3E2EE", borderRadius: 13, backgroundColor: "#FBFAFF" },
  picker: { minHeight: 45, color: "#0F172A" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E3E2EE", borderRadius: 21, backgroundColor: "#FBFAFF" },
  choiceSelected: { borderColor: "#7C3AED", backgroundColor: "#F5F3FF", shadowColor: "#7C3AED", shadowOpacity: 0.12, shadowRadius: 7 },
  radio: { width: 13, height: 13, borderWidth: 2, borderColor: "#94A3B8", borderRadius: 7 },
  radioSelected: { borderWidth: 4, borderColor: "#7C3AED" },
  choiceText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  choiceTextSelected: { color: "#5B21B6" },
  autofillCard: { flexDirection: "row", gap: 12, marginBottom: 20, padding: 16, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 15, backgroundColor: "#F5F3FF" },
  autofillItem: { minWidth: 0, flex: 1 },
  autofillLabel: { color: "#64748B", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  autofillValue: { marginTop: 3, color: "#4C1D95", fontSize: 13, fontWeight: "900" },
  captureBox: {
    minHeight: 104, flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderWidth: 1, borderColor: "#DCE4F2", borderRadius: 17,
    backgroundColor: "#F8FAFF", shadowColor: "#1E3A8A", shadowOpacity: 0.06,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  captureIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#E8F0FF" },
  captureIconSuccess: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0" },
  captureCopy: { minWidth: 0, flex: 1 },
  locationTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  captureTitle: { color: "#172554", fontSize: 12, fontWeight: "900" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: "#ECFDF5" },
  verifiedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#10B981" },
  verifiedText: { color: "#047857", fontSize: 7, fontWeight: "900", letterSpacing: 0.65 },
  captureDescription: { marginTop: 5, color: "#475569", fontSize: 10, lineHeight: 15, fontWeight: "700" },
  coordinateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  coordinateChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: "#EEF2FF" },
  coordinateLabel: { color: "#818CF8", fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  coordinateText: { color: "#3730A3", fontSize: 8, fontWeight: "900" },
  locationAction: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E0E7FF", borderRadius: 12, backgroundColor: "#FFFFFF" },
  cameraBox: {
    minHeight: 84, flexDirection: "row", alignItems: "center", gap: 11,
    padding: 10, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 14,
    backgroundColor: "#FAF8FF",
  },
  cameraPlaceholder: { width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#EDE9FE" },
  cardPreview: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#EDE9FE" },
  error: { marginTop: 5, color: "#DC2626", fontSize: 10, fontWeight: "700" },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#F0FDF4",
  },
  successIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
  },
  successTitle: { marginTop: 16, color: "#166534", fontSize: 22, fontWeight: "900" },
  successMessage: { marginTop: 8, color: "#15803D", fontSize: 13, fontWeight: "700", textAlign: "center" },
  submitPressable: {
    marginTop: 16, overflow: "hidden", borderRadius: 15, shadowColor: "#5B21B6",
    shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 6,
  },
  submit: {
    minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingHorizontal: 16,
  },
  submitIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#FFFFFF" },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.25 },
  submitArrow: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "rgba(255,255,255,0.14)" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
