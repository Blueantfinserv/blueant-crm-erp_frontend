import React, { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";

const MapView = forwardRef(function MapView(
  { children, style },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
  }));

  return (
    <View style={[style, styles.fallback]}>
      <Text style={styles.icon}>⌖</Text>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.message}>
        Interactive map Android/iOS preview mein available hai.
      </Text>
      {children}
    </View>
  );
});

export function Marker() {
  return null;
}

export default MapView;

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#b9c8e0",
    backgroundColor: "#eef4fc",
  },
  icon: {
    color: "#1677ff",
    fontSize: 34,
    fontWeight: "700",
  },
  title: {
    marginTop: 4,
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    marginTop: 4,
    paddingHorizontal: 20,
    color: "#555",
    fontSize: 12,
    textAlign: "center",
  },
});
