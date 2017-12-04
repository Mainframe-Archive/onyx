// @flow

import React, { Component } from 'react'
import { gql, graphql } from 'react-apollo'

import Modal from './Modal'
import UserProfile from './UserProfile'
import EditProfile from './EditProfile'

import { ProfileData } from '../graphql/fragments'

type Props = {
  profile: {
    id: string,
    avatar: ?string,
    name: ?string,
    bio?: ?string,
  },
  isSelf?: boolean,
  editRequired?: boolean,
  serverURL?: ?string,
  onCloseModal: () => void,
}

type State = {
  editMode: boolean,
}

export class UserProfileModal extends Component<Props, State> {

  state: State = {
    editMode: false,
  }

  onToggleEdit = () => {
    this.setState({
      editMode: !this.state.editMode,
    })
  }

  render() {
    const {
      profile,
      onCloseModal,
      serverURL,
      editRequired,
      isSelf,
    } = this.props

    if (profile == null) {
      return null
    }
    const title = this.state.editMode || editRequired
      ? 'Edit Profile'
      : profile.name || profile.id.substr(0, 8)

    return (
      <Modal isOpen onRequestClose={editRequired ? null : onCloseModal} title={title}>
        {
          this.state.editMode || editRequired ? (
            <EditProfile
              profile={profile}
              keyQRCode
              hideTitle
              serverURL={serverURL}
              onDoneEditing={this.onToggleEdit}
              onCloseModal={this.props.onCloseModal}
            />
          ) : (
            <UserProfile
              profile={profile}
              keyQRCode
              hideTitle
              canEdit={isSelf}
              serverURL={serverURL}
              onPressEdit={this.onToggleEdit}
            />
          )
        }
      </Modal>
    )
  }
}

const mapDataToProps = ({data, ownProps}: Object) => {
  if (ownProps.profile.id === data.viewer.profile.id) {
    return {
      isSelf: true,
      editRequired: !data.viewer.profile.name,
      profile: data.viewer.profile
    }
  }
}

const SelfProfileQuery = gql`
  ${ProfileData}
  query SelfProfileQuery {
    viewer {
      profile {
        ...ProfileData
      }
    }
  }
`

export default graphql(
  SelfProfileQuery,
  { props: mapDataToProps },
)(UserProfileModal)
