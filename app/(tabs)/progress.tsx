import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { debugReverbStorage } from "../../utils/storage-debug";

export default function ProgressTabScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Progress</Text>
      <Text style={styles.placeholderText}>
        This is the Progress Tab. Here you'll monitor your growth across domains
        over time.
      </Text>
      <Button title="Debug Storage" onPress={debugReverbStorage} />
      {/* <Button title="List All Storage" onPress={listAllStorage} />
      <Button title="Clear Reverb Storage" onPress={clearReverbStorage} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#666",
  },
});
