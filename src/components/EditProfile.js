// @flow

import React, { Component } from 'react'
import { View, StyleSheet } from 'react-native-web'
import { compose } from 'react-apollo'

import Avatar from './Avatar'
import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Text from './Text'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

import {
  UpdateProfileMutation,
  type UpdateProfileFunc,
} from '../graphql/mutations'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
    name: ?string,
    bio?: ?string,
  },
  onDoneEditing: () => void,
  onCloseModal: () => void,
  updateProfile: UpdateProfileFunc,
}

type State = {
  name: string,
  bio: bio,
  invalidMessage?: ?string,
}

export class EditProfile extends Component<Props, State> {

  constructor (props: Props) {
    super(props)
    const { profile } = props
    this.state = {
      name: profile.name,
      bio: profile.bio,
    }
  }

  onSave = () => {
    if (this.state.name) {
      const firstEdit = !this.props.profile.name
      this.props.updateProfile({
        name: this.state.name,
        bio: this.state.bio,
      })
      if (firstEdit) {
        this.props.onCloseModal()
      } else {
        this.props.onDoneEditing()
      }
    } else {
      this.setState({
        invalidMessage: '* Please provide a name',
      })
    }
  }

  onChangeName = (value) => {
    this.setState({
      name: value,
    })
  }

  onChangeBio = (value) => {
    this.setState({
      bio: value,
    })
  }

  render() {
    const { profile } = this.props
    const { name, bio, invalidMessage } = this.state
    if (profile == null) {
      return null
    }

    const validationMessage = invalidMessage ? (
      <View style={styles.validationError}>
        <Text style={styles.failedValidationText}>{invalidMessage}</Text>
      </View>
    ) : null
    return (
      <View style={styles.container}>
        <View style={styles.userProfile}>
          <View style={styles.avatarArea}>
            <Avatar size="xx-large" profile={profile} />
          </View>
          <View style={styles.userData}>
            {validationMessage}
            <TextInput
              onChangeText={this.onChangeName}
              placeholder="name"
              value={name}
              />
            <TextInput
              onChangeText={this.onChangeBio}
              placeholder="bio"
              value={bio}
              multiline
              />
            <Button title="Done" onPress={this.onSave}/>
          </View>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: BASIC_SPACING / 2,
    marginBottom: BASIC_SPACING / 2,
  },
  title: {
    fontSize: 18,
    color: COLORS.PRIMARY_BLUE,
    fontWeight: '600',
    padding: BASIC_SPACING,
  },
  userProfile: {
    flexDirection: 'column',
    width: '100%',
    paddingHorizontal: BASIC_SPACING,
    alignItems: 'center',
  },
  userData: {
    maxWidth: 500,
    paddingVertical: 2 * BASIC_SPACING,
  },
  failedValidation: {
    padding: BASIC_SPACING,
    borderRadius: 5,
  },
  failedValidationText: {
    textAlign: 'center',
    color: COLORS.PRIMARY_RED,
  }
})

export default compose(
  UpdateProfileMutation,
)(EditProfile)
