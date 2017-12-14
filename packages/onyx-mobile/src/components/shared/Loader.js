// @flow

import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

const Loader = () => (
  <View style={styles.container}>
    <ActivityIndicator animating size="large" />
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default Loader
