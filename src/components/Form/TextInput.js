// @flow

import React, { Component } from 'react'
import { View, TextInput, StyleSheet } from 'react-native-web'

import COLORS from '../../colors'
import { BASIC_SPACING } from '../../styles'

type Props = {
  onBlur?: () => void,
  onFocus?: () => void,
}

type State = {
  active: boolean,
}

export default class Input extends Component<Props, State> {
  state = {
    active: false,
  }

  onFocus = () => {
    this.setState({
      active: true,
    })
    this.props.onFocus && this.props.onFocus()
  }

  onBlur = () => {
    this.setState({
      active: false,
    })
    this.props.onBlur && this.props.onBlur()
  }

  render() {
    const fieldStyles = [styles.field]
    const fieldContainerStyles = [styles.fieldContainer]

    if (this.state.active) {
      fieldStyles.push(styles.active)
      fieldContainerStyles.push(styles.activeFieldContainer)
    }

    return (
      <View style={fieldContainerStyles}>
        <TextInput
          {...this.props}
          style={fieldStyles}
          onBlur={this.onBlur}
          onFocus={this.onFocus}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  fieldContainer: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 3 * BASIC_SPACING,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginVertical: BASIC_SPACING,
  },
  field: {
    flex: 1,
    fontSize: 18,
    color: COLORS.DARK_GRAY,
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingVertical: 1.5 * BASIC_SPACING,
    outline: 'none',
    width: '100%',
    maxWidth: '100%',
  },
  activeFieldContainer: {
    borderStyle: 'solid',
    borderWidth: 1,
    paddingHorizontal: 3 * BASIC_SPACING - 1,
    borderColor: COLORS.MEDIUM_GRAY,
  },
  active: {
    paddingVertical: 1.5 * BASIC_SPACING - 1,
  },
})
