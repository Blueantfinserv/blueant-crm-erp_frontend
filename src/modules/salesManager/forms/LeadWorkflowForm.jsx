import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "../../../../PreviewMap";

const LEAD_SOURCES = ["Referral", "Website", "Walk-in", "Other"];
const MEETING_STATUSES = ["Meeting Conducted", "Meeting Not Conducted"];
const JOINED_DESIGNATIONS = ["Admin", "RM", "Leader", "Team Leader", "Sales Manager"];
const LEAD_STATUSES = [
  "Already BlueAnt Client",
  "Converted Client",
  "Remove This Client",
  "Client Not Interested",
  "Work in Progress",
];
const PROFESSIONS = [
  "Salaried",
  "Business Owner",
  "Self Employed",
  "Doctor",
  "Chartered Accountant",
  "Lawyer",
  "Engineer",
  "Teacher",
  "Government Employee",
  "Retired",
];
const AGE_GROUPS = ["Less than 20", "20–30", "31–40", "41–50", "51–60", "More than 60"];
const FOLLOW_UP_TIMES = ["9 AM–11 AM", "11 AM–1 PM", "1 PM–3 PM", "3 PM–5 PM", "Late Evening"];
const QUALIFICATIONS = ["Hot", "Medium", "Cold"];
const KIDS_OPTIONS = ["No Kids", "1", "2", "2+"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];
const INITIAL_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 22,
  longitudeDelta: 22,
};

export default function LeadWorkflowForm({ type, lead, onClose, onSubmit }) {
  const isNewLead = type === "new-lead";
  const isFirstMeeting = type === "first-meeting";
  const needsLocationPin = isFirstMeeting && !lead?.hasLocationPin;
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState("");
  const [imageLoading, setImageLoading] = useState("");
  const [images, setImages] = useState({
    visitingCard: null,
    adBoard: null,
  });
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
    meetingStatus: "",
    leadStatus: "",
    joinedMode: "Alone",
    joinedWith: "",
    joinedDesignation: "",
    nextPlanDate: "",
    panNumber: "",
    amount: "",
    investmentType: "",
    leadEmail: "",
    profession: "",
    ageGroup: "",
    bestFollowUpTime: "",
    leadQualification: "",
    kids: "",
    maritalStatus: "",
    priorInvestment: "",
    priorInvestmentDetails: "",
    adviceMode: "",
  });
  const [coordinates, setCoordinates] = useState(
    lead?.hasLocationPin ? lead.coordinates : null
  );

  useEffect(() => {
    if (!submissionSuccess) return undefined;
    const timer = setTimeout(onClose, 1000);
    return () => clearTimeout(timer);
  }, [onClose, submissionSuccess]);

  const title = useMemo(() => {
    if (isNewLead) return "New Lead";
    if (isFirstMeeting) return "1st Meeting Update";
    return "Meeting Update";
  }, [isFirstMeeting, isNewLead]);
  const subtitle = isNewLead
    ? "Capture a fresh opportunity in a few quick steps"
    : isFirstMeeting
      ? "Record the first interaction and decide the next move"
      : "Keep the client journey updated and moving forward";

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmissionError("");
  };

  const captureLocation = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setErrors((current) => ({ ...current, coordinates: "Location permission is required." }));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordinates(next);
      setErrors((current) => ({ ...current, coordinates: undefined }));
      mapRef.current?.animateToRegion(
        { ...next, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        400
      );
    } catch {
      setErrors((current) => ({ ...current, coordinates: "Location could not be captured." }));
    } finally {
      setLoading(false);
    }
  };

  const chooseImage = async (field, source) => {
    setImageLoading(field);
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrors((current) => ({ ...current, [field]: "Permission is required to add this image." }));
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75 });
      if (result.canceled) return;
      setImages((current) => ({ ...current, [field]: result.assets[0] }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    } catch {
      setErrors((current) => ({ ...current, [field]: "Image could not be selected." }));
    } finally {
      setImageLoading("");
    }
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
      if (needsLocationPin && form.meetingStatus === "Meeting Conducted" && !coordinates) {
        nextErrors.coordinates = "Live location is required.";
      }
      if (!form.meetingStatus) nextErrors.meetingStatus = "Meeting status is required.";
      if (!form.remarks.trim()) nextErrors.remarks = "Remarks are required.";

      if (form.meetingStatus === "Meeting Not Conducted") {
        if (!form.nextPlanDate) nextErrors.nextPlanDate = "Next plan date is required.";
      } else if (form.meetingStatus === "Meeting Conducted") {
        if (!form.leadStatus) nextErrors.leadStatus = "Lead status is required.";
        if (form.joinedMode === "Other" && !form.joinedWith.trim()) {
          nextErrors.joinedWith = "Person's name is required.";
        }
        if (form.joinedMode === "Other" && !form.joinedDesignation) {
          nextErrors.joinedDesignation = "Person designation is required.";
        }
        if (isFirstMeeting) {
          if (form.leadEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.leadEmail)) {
            nextErrors.leadEmail = "Enter a valid email address.";
          }
          if (!form.profession) nextErrors.profession = "Profession is required.";
          if (!form.ageGroup) nextErrors.ageGroup = "Age group is required.";
          if (!form.bestFollowUpTime) nextErrors.bestFollowUpTime = "Follow-up time is required.";
          if (!form.leadQualification) nextErrors.leadQualification = "Qualification is required.";
          if (!form.kids) nextErrors.kids = "Select an option.";
          if (!form.maritalStatus) nextErrors.maritalStatus = "Marital status is required.";
          if (!form.priorInvestment) nextErrors.priorInvestment = "Select Yes or No.";
          if (form.priorInvestment === "Yes" && !form.priorInvestmentDetails.trim()) {
            nextErrors.priorInvestmentDetails = "Add prior investment details.";
          }
          if (form.priorInvestment === "Yes" && !form.adviceMode) {
            nextErrors.adviceMode = "Select Advisor or Alone.";
          }
        }
        if (form.leadStatus === "Work in Progress" && !form.nextPlanDate) {
          nextErrors.nextPlanDate = "Next plan date is required.";
        }
        if (form.leadStatus === "Converted Client") {
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.trim().toUpperCase())) {
            nextErrors.panNumber = "Enter a valid PAN number.";
          }
          if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Valid amount is required.";
          if (!form.investmentType) nextErrors.investmentType = "Select SIP or Lumpsum.";
        }
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const workflowPayload = {
      type,
      leadId: lead?.id,
      ...form,
      panNumber: form.panNumber.toUpperCase(),
      coordinates,
      hasLocationPin: Boolean(coordinates),
      images,
    };

    if (!isNewLead) {
      onSubmit?.(workflowPayload);
      onClose();
      return;
    }

    const createLeadRequest = {
      clientName: form.name.trim(),
      mobileNumber: form.number.replace(/\D/g, ""),
      location: form.locationText.trim(),
      leadSource: form.leadSource.trim().toUpperCase().replace(/[\s-]+/g, "_"),
      remarks: form.remarks.trim(),
    };

    setSubmissionError("");
    setSubmitting(true);
    try {
      const successMessage = await onSubmit?.(createLeadRequest);
      setSubmissionSuccess(successMessage || "Lead created successfully.");
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
          ? error.message
          : "Lead creation failed.";
      setSubmissionError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const meetingNotConducted = form.meetingStatus === "Meeting Not Conducted";
  const meetingConducted = form.meetingStatus === "Meeting Conducted";
  const showNextPlanDate =
    meetingNotConducted || (meetingConducted && form.leadStatus === "Work in Progress");
  const showConversion = meetingConducted && form.leadStatus === "Converted Client";

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
            <Text style={styles.eyebrow}>{isNewLead ? "Lead creation" : lead?.meetingStage}</Text>
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

              <Field label="Meeting Status" required error={errors.meetingStatus}>
                <ChoiceGroup
                  value={form.meetingStatus}
                  options={MEETING_STATUSES}
                  onChange={(value) => update("meetingStatus", value)}
                />
              </Field>

              {meetingConducted ? (
                <>
                  <Field label="Lead Status" required error={errors.leadStatus}>
                    <Select value={form.leadStatus} options={LEAD_STATUSES} onChange={(value) => update("leadStatus", value)} />
                  </Field>
                  <Field label="Joined With" required>
                    <ChoiceGroup
                      value={form.joinedMode}
                      options={["Alone", "Other"]}
                      onChange={(value) => {
                        update("joinedMode", value);
                        if (value === "Alone") {
                          update("joinedWith", "");
                          update("joinedDesignation", "");
                        }
                      }}
                    />
                  </Field>
                  {form.joinedMode === "Other" ? (
                    <>
                      <Field label="Name of the Person" required error={errors.joinedWith}>
                      <Input
                        value={form.joinedWith}
                        onChangeText={(value) => update("joinedWith", value)}
                        placeholder="Enter person's name"
                      />
                      </Field>
                      <Field label="Person Designation" required error={errors.joinedDesignation}>
                        <Select
                          value={form.joinedDesignation}
                          options={JOINED_DESIGNATIONS}
                          onChange={(value) => update("joinedDesignation", value)}
                        />
                      </Field>
                    </>
                  ) : null}
                  {isFirstMeeting ? (
                    <View style={styles.profileSection}>
                      <View style={styles.profileSectionHeader}>
                        <View style={styles.profileSectionIcon}>
                          <Icon source="account-heart-outline" size={17} color="#7C3AED" />
                        </View>
                        <View>
                          <Text style={styles.profileSectionTitle}>Lead Profile</Text>
                          <Text style={styles.profileSectionCaption}>Details for better follow-up and qualification</Text>
                        </View>
                      </View>

                      <Field label="Lead Email" error={errors.leadEmail}>
                        <Input
                          value={form.leadEmail}
                          onChangeText={(value) => update("leadEmail", value)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholder="client@example.com"
                        />
                      </Field>
                      <Field label="Profession" required error={errors.profession}>
                        <Select value={form.profession} options={PROFESSIONS} onChange={(value) => update("profession", value)} />
                      </Field>
                      <Field label="Age Group" required error={errors.ageGroup}>
                        <Select value={form.ageGroup} options={AGE_GROUPS} onChange={(value) => update("ageGroup", value)} />
                      </Field>
                      <Field label="Best Time to Follow Up" required error={errors.bestFollowUpTime}>
                        <Select value={form.bestFollowUpTime} options={FOLLOW_UP_TIMES} onChange={(value) => update("bestFollowUpTime", value)} />
                      </Field>
                      <Field label="Lead Qualification" required error={errors.leadQualification}>
                        <ChoiceGroup value={form.leadQualification} options={QUALIFICATIONS} onChange={(value) => update("leadQualification", value)} />
                      </Field>
                      <Field label="Any Kids" required error={errors.kids}>
                        <ChoiceGroup value={form.kids} options={KIDS_OPTIONS} onChange={(value) => update("kids", value)} />
                      </Field>
                      <Field label="Marital Status" required error={errors.maritalStatus}>
                        <Select value={form.maritalStatus} options={MARITAL_STATUSES} onChange={(value) => update("maritalStatus", value)} />
                      </Field>
                      <ImageQuestion
                        label="Visiting Card Image"
                        image={images.visitingCard}
                        loading={imageLoading === "visitingCard"}
                        error={errors.visitingCard}
                        onCamera={() => chooseImage("visitingCard", "camera")}
                        onGallery={() => chooseImage("visitingCard", "gallery")}
                      />
                      <ImageQuestion
                        label="Ad Board Image"
                        image={images.adBoard}
                        loading={imageLoading === "adBoard"}
                        error={errors.adBoard}
                        onCamera={() => chooseImage("adBoard", "camera")}
                        onGallery={() => chooseImage("adBoard", "gallery")}
                      />
                      <Field label="Any Prior Investment" required error={errors.priorInvestment}>
                        <ChoiceGroup
                          value={form.priorInvestment}
                          options={["Yes", "No"]}
                          onChange={(value) => {
                            update("priorInvestment", value);
                            if (value === "No") {
                              update("priorInvestmentDetails", "");
                              update("adviceMode", "");
                            }
                          }}
                        />
                        {form.priorInvestment === "Yes" ? (
                          <>
                            <Input
                              value={form.priorInvestmentDetails}
                              onChangeText={(value) => {
                                const words = value.trim().split(/\s+/).filter(Boolean);
                                if (words.length <= 20) update("priorInvestmentDetails", value);
                              }}
                              multiline
                              style={[styles.textarea, styles.followupInput]}
                              placeholder="Describe prior investments in up to 20 words"
                            />
                            <Text style={styles.wordCount}>
                              {form.priorInvestmentDetails.trim().split(/\s+/).filter(Boolean).length}/20 words
                            </Text>
                            {errors.priorInvestmentDetails ? <Text style={styles.error}>{errors.priorInvestmentDetails}</Text> : null}
                          </>
                        ) : null}
                      </Field>
                      {form.priorInvestment === "Yes" ? (
                        <Field label="Investment Guidance" required error={errors.adviceMode} last>
                          <ChoiceGroup value={form.adviceMode} options={["Advisor", "Alone"]} onChange={(value) => update("adviceMode", value)} />
                        </Field>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : null}

              {meetingConducted ? (
                <LocationField
                  optional={!needsLocationPin}
                  coordinates={coordinates}
                  error={errors.coordinates}
                  loading={loading}
                  mapRef={mapRef}
                  onCapture={captureLocation}
                  onChange={setCoordinates}
                />
              ) : null}

              {form.meetingStatus ? (
                <Field label="Remarks" required error={errors.remarks}>
                  <Input
                    value={form.remarks}
                    onChangeText={(value) => update("remarks", value)}
                    multiline
                    style={styles.textarea}
                    placeholder="Meeting remarks"
                  />
                </Field>
              ) : null}

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

              {showConversion ? (
                <View style={styles.conditionalCard}>
                  <Text style={styles.conditionalTitle}>Conversion Details</Text>
                  <Field label="Client PAN Number" required error={errors.panNumber}>
                    <Input
                      value={form.panNumber}
                      onChangeText={(value) => update("panNumber", value.toUpperCase().slice(0, 10))}
                      autoCapitalize="characters"
                      placeholder="ABCDE1234F"
                    />
                  </Field>
                  <Field label="Amount" required error={errors.amount}>
                    <Input
                      value={form.amount}
                      onChangeText={(value) => update("amount", value.replace(/[^\d.]/g, ""))}
                      keyboardType="decimal-pad"
                      placeholder="Investment amount"
                    />
                  </Field>
                  <Field label="Investment Type" required error={errors.investmentType} last>
                    <ChoiceGroup
                      value={form.investmentType}
                      options={["SIP", "Lumpsum"]}
                      onChange={(value) => update("investmentType", value)}
                    />
                  </Field>
                </View>
              ) : null}
            </>
          )}
          </View>

          {isNewLead && submissionError ? (
            <Text style={styles.error}>{submissionError}</Text>
          ) : null}

          <Pressable disabled={isNewLead && submitting} onPress={() => void submit()} style={({ pressed }) => [styles.submitPressable, pressed && styles.pressed]}>
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submit}
            >
              <View style={styles.submitIcon}>
                {isNewLead && submitting
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
          <Text style={styles.successTitle}>Lead Created</Text>
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

function LocationField({ optional, coordinates, error, loading, mapRef, onCapture, onChange }) {
  return (
    <Field label="Live Location Pin" required={!optional} error={error}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={coordinates ? { ...coordinates, latitudeDelta: 0.008, longitudeDelta: 0.008 } : INITIAL_REGION}
        onPress={(event) => onChange(event.nativeEvent.coordinate)}
      >
        {coordinates ? (
          <Marker coordinate={coordinates} draggable onDragEnd={(event) => onChange(event.nativeEvent.coordinate)} />
        ) : null}
      </MapView>
      <View style={styles.locationFooter}>
        <View style={styles.coordinates}>
          <Text style={styles.coordinateText}>
            {coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : "No location pinned"}
          </Text>
        </View>
        <Pressable onPress={onCapture} disabled={loading} style={styles.locationButton}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
            <>
              <Icon source="crosshairs-gps" size={14} color="#FFFFFF" />
              <Text style={styles.locationButtonText}>Use Live Location</Text>
            </>
          )}
        </Pressable>
      </View>
    </Field>
  );
}

function ImageQuestion({ label, image, loading, error, onCamera, onGallery }) {
  return (
    <Field label={label} error={error}>
      <View style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon source="image-plus" size={25} color="#A78BFA" />
            <Text style={styles.imagePlaceholderText}>No image selected</Text>
          </View>
        )}
        <View style={styles.imageActions}>
          <Pressable disabled={loading} onPress={onCamera} style={styles.imageAction}>
            <Icon source="camera-outline" size={15} color="#6D28D9" />
            <Text style={styles.imageActionText}>Camera</Text>
          </Pressable>
          <Pressable disabled={loading} onPress={onGallery} style={styles.imageAction}>
            <Icon source="image-multiple-outline" size={15} color="#6D28D9" />
            <Text style={styles.imageActionText}>Gallery</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="small" color="#7C3AED" />
          </View>
        ) : null}
      </View>
    </Field>
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
  conditionalCard: { marginBottom: 16, padding: 14, borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 14, backgroundColor: "#F8FBFF" },
  conditionalTitle: { marginBottom: 13, color: "#1D4ED8", fontSize: 13, fontWeight: "900" },
  profileSection: {
    marginBottom: 16, padding: 16, borderWidth: 1, borderColor: "#E9D5FF",
    borderRadius: 16, backgroundColor: "#FCFAFF",
  },
  profileSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1E8FF",
  },
  profileSectionIcon: {
    width: 34, height: 34, alignItems: "center", justifyContent: "center",
    borderRadius: 11, backgroundColor: "#F3E8FF",
  },
  profileSectionTitle: { color: "#4C1D95", fontSize: 13, fontWeight: "900" },
  profileSectionCaption: { marginTop: 2, color: "#8B7AA8", fontSize: 9, fontWeight: "600" },
  imagePicker: {
    position: "relative", overflow: "hidden", borderWidth: 1, borderColor: "#E3E2EE",
    borderRadius: 13, backgroundColor: "#FFFFFF",
  },
  imagePreview: { width: "100%", height: 120 },
  imagePlaceholder: {
    height: 86, alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: "#FAF8FF",
  },
  imagePlaceholderText: { color: "#9386AA", fontSize: 9, fontWeight: "700" },
  imageActions: {
    flexDirection: "row", gap: 8, padding: 8, borderTopWidth: 1,
    borderTopColor: "#F1EDF7",
  },
  imageAction: {
    minHeight: 34, flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 5, borderRadius: 9, backgroundColor: "#F5F3FF",
  },
  imageActionText: { color: "#6D28D9", fontSize: 10, fontWeight: "900" },
  imageLoader: {
    ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  wordCount: { marginTop: 5, color: "#9386AA", fontSize: 9, fontWeight: "700", textAlign: "right" },
  map: { width: "100%", height: 190, overflow: "hidden", borderRadius: 10 },
  locationFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  coordinates: { minWidth: 0, flex: 1 },
  coordinateText: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  locationButton: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#2563EB" },
  locationButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
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
