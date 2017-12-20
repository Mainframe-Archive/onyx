// @flow
import React, { Component } from 'react'
import { TextInput as RNTextInput, StyleSheet } from 'react-native'
import colors from '../colors'

type Props = {
  value?: string,
  placeholder: string,
  style: number | Object | Array<number | Object>,
  onChangeText: (value: string) => void
}

export default class TextInput extends Component<Props> {
  render() {
    const inputStyles = [styles.textInput]
    if (this.props.style) {
      inputStyles.push(this.props.style)
    }
    return (
      <RNTextInput
        {...this.props}
        style={inputStyles}
        underlineColorAndroid="transparent"
      />
    )
  }
}

const styles = StyleSheet.create({
  textInput: {
    height: 50,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.WHITE,
    fontSize: 16
  }
})
