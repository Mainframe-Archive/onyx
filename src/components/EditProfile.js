// @flow

import React, { Component } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native-web'
import { compose } from 'react-apollo'
import PropTypes from 'prop-types'

import Avatar from './Avatar'
import TextInput from './Form/TextInput'
import Button from './Form/Button'
import Text from './Text'
import FileSelector from './FileSelector'
import Icon from './Icon'

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
  static contextTypes = {
    httpServerUrl: PropTypes.string.isRequired,
  }

  fileSelector: ?Element<typeof FileSelector>

  constructor(props: Props) {
    super(props)
    const { profile } = props
    this.state = {
      name: profile.name,
      bio: profile.bio,
    }
  }

  bindFileSelector = (fileSelector: ?Element<typeof FileSelector>) => {
    this.fileSelector = fileSelector
  }

  onFilesSelected = (files: Array<Object>) => {
    if (files.length) {
      this.uploadFile(files[0])
    }
  }

  uploadFile = (file: Object) => {
    const reader = new FileReader()
    reader.onload = async e => {
      const res = await fetch(`${this.context.httpServerUrl}/bzzr:`, {
        body: e.currentTarget.result,
        headers: {
          'Content-Length': file.size,
          'Content-Type': file.type,
        },
        method: 'POST',
      })
      await this.saveProfile({
        avatar: await res.text(),
      })
    }
    reader.readAsArrayBuffer(file)
  }

  onSave = async () => {
    if (this.state.name) {
      const firstEdit = !this.props.profile.name
      try {
        await this.saveProfile({
          name: this.state.name,
          bio: this.state.bio,
        })
        if (firstEdit) {
          this.props.onCloseModal()
        } else {
          this.props.onDoneEditing()
        }
      } catch (err) {
        console.warn(err)
      }
    } else {
      this.setState({
        invalidMessage: '* Please provide a name',
      })
    }
  }

  saveProfile = async (data: {
    name?: string,
    bio?: string,
    avatar?: string,
  }) => {
    this.setState({
      invalidMessage: undefined,
    })
    try {
      await this.props.updateProfile(data)
    } catch (err) {
      this.setState({
        invalidMessage: '* Oops, there was a problem updating your profile',
      })
      throw err
    }
  }

  onChangeName = value => {
    this.setState({
      name: value,
    })
  }

  onChangeBio = value => {
    this.setState({
      bio: value,
    })
  }

  onPressAvatar = () => {
    this.fileSelector && this.fileSelector.openFileSelector()
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
            <TouchableOpacity
              style={styles.avatarUpload}
              onPress={this.onPressAvatar}
          >
              <Icon name="camera" />
              <Text style={styles.avatarUploadText}>Upload photo</Text>
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Avatar size="large" profile={profile} />
            </View>
          </View>
          <FileSelector
            onFilesSelected={this.onFilesSelected}
            //$FlowFixMe
            ref={this.bindFileSelector}
          />
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
            <Button title="Done" onPress={this.onSave} />
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
  },
  avatarArea: {
    width: 160,
    height: 160,
    position: 'relative',
  },
  avatarUpload: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.GRAY_E6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    borderRadius: 80,
  },
  avatarUploadText: {
    color: COLORS.PRIMARY_RED,
  },
  avatar: {
    position: 'absolute',
    right: -10,
    bottom: 10,
  },
})

export default compose(UpdateProfileMutation)(EditProfile)
