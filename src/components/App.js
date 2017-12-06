// @flow

import React, { Component } from 'react'
import { compose, gql, graphql } from 'react-apollo'
import { connect } from 'react-redux'
import { StyleSheet, View } from 'react-native-web'
import { groupBy } from 'lodash'
import PropTypes from 'prop-types'

import {
  getOpenChannel,
  getOpenContact,
  setOpenChannel,
  setOpenContact,
} from '../data/Navigation'
import type { State as GlobalState } from '../data/Store'

import { ConvoMeta, ProfileData } from '../graphql/fragments'
import {
  CreateChannelMutation,
  RequestContactMutation,
  type CreateChannelFunc,
  type RequestContactFunc,
} from '../graphql/mutations'

import Contact from './Contact'
import CreateChannelModal, { type ChannelData } from './CreateChannelModal'
import AddContactModal from './AddContactModal'
import UserProfileModal from './UserProfileModal'
import Conversation from './Conversation'
import Loader from './Loader'

import ConversationTitle from './LeftNav/ConversationTitle'
import Profile from './LeftNav/Profile'
import SectionTitle from './LeftNav/SectionTitle'
import ContactListLabel from './LeftNav/ContactListLabel'
import MainframeBar, { FOOTER_SIZE } from './MainframeBar'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type UnsubscribeFunc = () => void
type SubscribeFunc = () => UnsubscribeFunc

type Props = {
  createChannel: CreateChannelFunc,
  data: Object,
  openChannel: ?string,
  openContact: ?string,
  requestContact: RequestContactFunc,
  setOpenChannel: (id: string) => void,
  setOpenContact: (id: string) => void,
  subscribeToChannelsChanged: SubscribeFunc,
  subscribeToContactsChanged: SubscribeFunc,
}

type ModalName = 'channel' | 'contact' | 'profile'

type State = {
  openModal: ?ModalName,
  openProfile: ?Object,
}

class App extends Component<Props, State> {
  static contextTypes = {
    client: PropTypes.object.isRequired,
    wsConnected$: PropTypes.object.isRequired,
  }

  state = {
    openModal: undefined,
    openProfile: undefined,
  }

  unsubscribeChannelsChanged: UnsubscribeFunc
  unsubscribeConnectionClosed: UnsubscribeFunc
  unsubscribeContactsChanged: UnsubscribeFunc

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.data &&
      nextProps.data.viewer &&
      !nextProps.data.viewer.profile.name
    ) {
      this.setState({
        openProfile: nextProps.data.viewer.profile,
      })
    }
  }

  componentDidMount() {
    this.unsubscribeChannelsChanged = this.props.subscribeToChannelsChanged()
    this.unsubscribeContactsChanged = this.props.subscribeToContactsChanged()

    this.unsubscribeConnectionClosed = this.context.client
      .subscribe({
        query: gql`
          subscription ConnectionClosed {
            connectionClosed
          }
        `,
      })
      .subscribe({
        next: () => {
          console.log('connection closed')
          // TODO: Investigate broken sub since server separation
          // may no longer be required with updated connection handling
        },
      })
  }

  componentWillUnmount() {
    if (this.context.wsConnected$.value) {
      this.unsubscribeChannelsChanged()
      this.unsubscribeContactsChanged()
      this.unsubscribeConnectionClosed()
    }
  }

  onCloseModal = () => {
    this.setState({ openModal: undefined, openProfile: undefined })
  }

  onPressAddContact = (id: string) => {
    if (id !== this.props.data.viewer.profile.id) {
      this.props.requestContact(id)
    }
    this.setState({ openModal: undefined })
  }

  onPressCreateChannel = async (channelData: ChannelData) => {
    this.onCloseModal()
    const { data } = await this.props.createChannel(channelData)
    this.props.setOpenChannel(data.createChannel.id)
  }

  onPressOpenAddContact = () => {
    this.setState({ openModal: 'contact' })
  }

  onPressOpenCreateChannel = () => {
    this.setState({ openModal: 'channel' })
  }

  setOpenContact = (profile: Object) => {
    this.props.setOpenContact(profile.id)
  }

  onPressOpenProfile = (openProfile: ?Object) => {
    this.setState({
      openModal: 'profile',
      openProfile,
    })
  }

  renderAddContactModal() {
    const { openModal } = this.state

    return (
      <AddContactModal
        isOpen={openModal === 'contact'}
        onPressAddContact={this.onPressAddContact}
        onCloseModal={this.onCloseModal}
      />
    )
  }

  renderProfileModal() {
    const { openProfile } = this.state
    return openProfile ? (
      <UserProfileModal
        profile={openProfile}
        serverURL={this.props.data.serverURL}
        onCloseModal={this.onCloseModal}
      />
    ) : null
  }

  renderCreateChannelModal() {
    const { data } = this.props

    return (
      <CreateChannelModal
        isOpen={this.state.openModal === 'channel'}
        onCloseModal={this.onCloseModal}
        // $FlowFixMe
        onPressCreateChannel={this.onPressCreateChannel}
        contacts={data.viewer.contacts}
      />
    )
  }

  mapContacts = c => (
    <Profile
      key={c.profile.id}
      profile={c.profile}
      isOpen={c.profile.id === this.props.openContact}
      onOpen={this.setOpenContact}
      state={c.state}
      newMessages={c.convo ? c.convo.pointer !== c.convo.messageCount : false}
    />
  )

  render() {
    const { data, openChannel, openContact, setOpenChannel } = this.props

    if (data == null || data.viewer == null) {
      return (
        <View style={styles.loaderContainer}>
          <Loader />
          <MainframeBar footer />
        </View>
      )
    }

    const channelsList = data.viewer.channels.map(c => (
      <ConversationTitle
        conversation={c}
        key={c.id}
        isOpen={c.id === openChannel}
        onOpen={setOpenChannel}
        newMessages={c.pointer !== c.messageCount}
      />
    ))

    const contacts = groupBy(data.viewer.contacts, 'state')

    let main = null
    if (openContact != null) {
      main = <Contact id={openContact} key={openContact} />
    } else if (openChannel != null) {
      main = <Conversation id={openChannel} key={openChannel} />
    }

    return (
      <View style={styles.layout}>
        {this.renderAddContactModal()}
        {this.renderCreateChannelModal()}
        {this.renderProfileModal()}
        <View style={styles.column}>
          <View style={styles.profile}>
            <Profile
              profile={data.viewer.profile}
              onOpen={this.onPressOpenProfile}
              large
              showID
            />
          </View>
          <View style={styles.leftNavContent}>
            <View style={[styles.list, styles.channels]}>
              <SectionTitle
                title="Channels"
                onPressPlus={this.onPressOpenCreateChannel}
              />
              {channelsList}
            </View>

            <View style={styles.list}>
              <SectionTitle
                title="Contacts"
                onPressPlus={this.onPressOpenAddContact}
              />
              {contacts.ACCEPTED && contacts.ACCEPTED.map(this.mapContacts)}
              {(contacts.SENT && contacts.SENT.length) ||
              (contacts.RECEIVED && contacts.RECEIVED.length) ? (
                <View>
                  <ContactListLabel title="Pending" />
                  {contacts.SENT && contacts.SENT.map(this.mapContacts)}
                  {contacts.RECEIVED && contacts.RECEIVED.map(this.mapContacts)}
                </View>
              ) : null}
              {contacts.null && contacts.null.length ? (
                <View>
                  <ContactListLabel title="Others" />
                  {contacts.null.map(this.mapContacts)}
                </View>
              ) : null}
            </View>
          </View>
          <MainframeBar />
        </View>
        <View style={styles.main}>{main}</View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: FOOTER_SIZE,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  formLayout: {
    flex: 1,
  },
  form: {
    alignSelf: 'center',
    paddingTop: 2 * BASIC_SPACING,
  },
  input: {
    borderWidth: 1,
    borderColor: 'black',
    marginBottom: 3,
    padding: 3,
  },
  column: {
    backgroundColor: COLORS.PRIMARY_BLUE,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100vh',
    width: 250,
  },
  leftNavContent: {
    flex: 1,
    overflowX: 'auto',
  },
  list: {
    paddingLeft: BASIC_SPACING + 4,
  },
  channels: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    paddingTop: BASIC_SPACING + 4,
    marginBottom: BASIC_SPACING + 4,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    height: '100vh',
  },
  addPeer: {
    fontSize: 12,
    padding: BASIC_SPACING / 2,
  },
  addPeerSelected: {
    fontWeight: 'bold',
  },
  addPeerDisabled: {
    fontStyle: 'italic',
  },
  menuItemText: {
    color: 'white',
    marginLeft: BASIC_SPACING / 2,
    overflow: 'hidden',
  },
  menuItemTextOpen: {
    color: 'black',
  },
  menuItemTouchable: {
    padding: BASIC_SPACING / 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  menuItemTouchableOpen: {
    backgroundColor: 'white',
  },
})

const AppQuery = graphql(
  gql`
    ${ConvoMeta}
    ${ProfileData}
    query AppQuery {
      serverURL
      viewer {
        channels {
          ...ConvoMeta
        }
        contacts {
          convo {
            ...ConvoMeta
          }
          profile {
            ...ProfileData
          }
          state
        }
        profile {
          ...ProfileData
        }
      }
    }
  `,
  {
    props: ({ data }) => ({
      data,
      subscribeToChannelsChanged: () =>
        data.subscribeToMore({
          document: gql`
            ${ConvoMeta}
            subscription AppChannelsChangedSubscription {
              channelsChanged {
                channels {
                  ...ConvoMeta
                }
              }
            }
          `,
          updateQuery: (prev, { subscriptionData }) => ({
            viewer: {
              ...prev.viewer,
              channels: subscriptionData.data.channelsChanged.channels,
            },
          }),
        }),
      subscribeToContactsChanged: () =>
        data.subscribeToMore({
          document: gql`
            ${ConvoMeta}
            ${ProfileData}
            subscription AppContactsChangedSubscription {
              contactsChanged {
                contacts {
                  convo {
                    ...ConvoMeta
                  }
                  profile {
                    ...ProfileData
                  }
                  state
                }
              }
            }
          `,
          updateQuery: (prev, { subscriptionData }) => ({
            serverURL: prev.serverURL,
            viewer: {
              ...prev.viewer,
              contacts: subscriptionData.data.contactsChanged.contacts,
            },
          }),
        }),
    }),
  },
)

// $FlowFixMe
const AppWithData = compose(
  CreateChannelMutation,
  RequestContactMutation,
  AppQuery,
)(App)

export default connect(
  (state: GlobalState) => ({
    openChannel: getOpenChannel(state),
    openContact: getOpenContact(state),
  }),
  { setOpenChannel, setOpenContact },
)(AppWithData)
