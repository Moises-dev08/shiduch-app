import React from "react";
import { Text, View } from "react-native";
import { seenPhotoTileStyles as styles } from "./SeenPhotoTile.styles";

interface SeenPhotoTileProps {
  compact?: boolean;
}

/** Label shown on a one-time photo after this viewer has already opened it. */
export function SeenPhotoTile({ compact = false }: SeenPhotoTileProps): React.JSX.Element {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={compact ? styles.compactTile : styles.tile}>
        <Text style={compact ? styles.compactLabel : styles.label}>Seen</Text>
      </View>
    </View>
  );
}
