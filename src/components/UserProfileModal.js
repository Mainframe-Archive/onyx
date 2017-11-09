// @flow

import React, { Component } from 'react'

import Modal from './Modal'
import UserProfile from './UserProfile'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
    name: ?string,
    bio?: ?string,
  },
  serverURL?: ?string,
  onCloseModal: () => void,
}

export default class UserProfileModal extends Component<Props> {
  render() {
    const { profile, onCloseModal, serverURL } = this.props

    if (profile == null) {
      return null
    }

    const title = profile.name || profile.id.substr(0, 8)
    return (
      <Modal isOpen onRequestClose={onCloseModal} title={title}>
        <UserProfile
          profile={profile}
          keyQRCode
          hideTitle
          serverURL={serverURL}
        />
      </Modal>
    )
  }
}
