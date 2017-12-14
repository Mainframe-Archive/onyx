// @flow

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { compose, gql, graphql } from 'react-apollo'
import { groupBy } from 'lodash'
import {
  View,
  ScrollView,
  TouchableHighlight,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  StatusBar
} from 'react-native'

import { navOpen } from '../../data/actions/navigation'
import { ConvoMeta, ProfileData } from '../../data/graphql/fragments'
import HomeContactView from './HomeContactView'
import SectionTitle from './HomeSectionTitle'
import ConversationTitle from './HomeConvoTitle'
import AddContactModal from '../contacts/AddContactModal'
import ContactProfile from '../contacts/ContactProfile'
import ContactListLabel from './ContactListLabel'
import CreateChannelModal from '../conversation/CreateChannelModal'
import TextInput from '../shared/TextInput'
import Loader from '../shared/Loader'
import Button from '../shared/Button'
import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type UnsubscribeFunc = () => void
type SubscribeFunc = () => UnsubscribeFunc

type Props = {
  data: Object,
  navOpen: () => void,
  subscribeToContactsChanged: SubscribeFunc
}

type State = {
  openModal?: ?{
    type: string,
    data: Object
  }
}

export class HomeScreen extends Component<Props, State> {
	static contextTypes = {
		wsConnected$: PropTypes.object.isRequired,
	}
  state: State = {
    openModal: undefined
  }

  unsubscribeChannelsChanged: UnsubscribeFunc
  unsubscribeContactsChanged: UnsubscribeFunc

  componentDidMount() {
    this.unsubscribeChannelsChanged = this.props.subscribeToChannelsChanged()
    this.unsubscribeContactsChanged = this.props.subscribeToContactsChanged()
  }

  componentWillUnmount() {
    if (this.context.wsConnected) {
			this.unsubscribeChannelsChanged()
			this.unsubscribeContactsChanged()
		}
  }

  // HANDLERS

  onPress = () => {
    this.props.navOpen('Conversation', { id: 'testId' })
  }

  onPressOpenChannel = channelId => {
    this.props.navOpen('Conversation', { id: channelId })
  }

  onPressOpenAddContact = () => {
    this.setState({ openModal: { type: 'contact' } })
  }

  onOpenContactDM = (convoId: Object) => {
    this.props.navOpen('Conversation', { id: convoId })
  }

  onPressOpenCreateChannel = () => {
    this.setState({ openModal: { type: 'create-channel' } })
  }

  onChannelCreated = (id) => {
    this.setState({ openModal: undefined })
    this.props.navOpen('Conversation', { id })
  }

  onCloseModal = () => {
    this.setState({ openModal: undefined })
  }

  onOpenProfile = (profile: Object) => {
    this.setState({
      openModal: {
        type: 'profile',
        data: profile
      }
    })
  }

  // RENDER

  mapContacts = c => {
    console.log('c: ', c)
    return (
      <HomeContactView
        key={c.profile.id}
        profile={c.profile}
        isOpen={c.profile.id === this.props.openContact}
        onOpenDM={this.onOpenContactDM}
        convoId={c.convo ? c.convo.id : null}
        state={c.state}
        newMessages={c.convo ? c.convo.pointer !== c.convo.messageCount : false}
      />
    )
  }

  renderAddContactModal() {
    const { openModal } = this.state
    return openModal && openModal.type === 'contact' ? (
      <AddContactModal
        requestContact={this.requestContact}
        onRequestClose={this.onCloseModal}
        visible
      />
    ) : null
  }

  renderContactProfile() {
    const { openModal } = this.state
    if (openModal && openModal.type === 'profile') {
      let title
      if (openModal.data.id === this.props.data.viewer.profile.id) {
        title = 'Your Profile'
      }
      return (
        <ContactProfile
          onRequestClose={this.onCloseModal}
          profile={openModal.data}
          title={title}
        />
      )
    }
    return null
  }

  renderCreateChannelModal() {
    const { openModal } = this.state
    if (openModal && openModal.type === 'create-channel') {
      return (
        <CreateChannelModal
          title="New Channel"
          contacts={this.props.data.viewer.contacts}
          onRequestClose={this.onCloseModal}
          onChannelCreated={this.onChannelCreated}
        />
      )
    }
    return null
  }

  render() {
    const { data } = this.props

    let mainView
    if (data && data.viewer) {
      const contacts = groupBy(data.viewer.contacts, 'state')

      const channelsList = data.viewer.channels.map(c => (
        <ConversationTitle
          conversation={c}
          key={c.id}
          isOpen={c.id === this.props.openChannel}
          onOpen={this.onPressOpenChannel}
          newMessages={c.pointer !== c.messageCount}
        />
      ))

      const pendingContacts = contacts.SENT || contacts.RECEIVED ? (
        <View>
          <ContactListLabel title="Pending" />
          {contacts.SENT && contacts.SENT.map(this.mapContacts)}
          {contacts.RECEIVED && contacts.RECEIVED.map(this.mapContacts)}
        </View>
      ) : null

      mainView = (
        <View>
          {this.renderAddContactModal()}
          {this.renderContactProfile()}
          {this.renderCreateChannelModal()}
          <HomeContactView
            profile={data.viewer.profile}
            onOpenProfile={this.onOpenProfile}
            contact={data.viewer.profile}
            large
            showID
          />
          <ScrollView contentContainerStyle={styles.scrollContent}>
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
              {pendingContacts}
            </View>
          </ScrollView>
        </View>
      )
    } else {
      mainView = <Loader />
    }

    return (
      <View style={styles.column}>
        <StatusBar barStyle="light-content" />
        <View style={styles.main}>
          {mainView}
        </View>
        <View style={styles.mainframe}>
          <Text style={styles.poweredText}>Powered by </Text>
          <Image
            style={{width: 200, height: 28}}
            resizeMode="contain"
            source={require('../../../assets/images/mainframe-logo.png')} />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row'
  },
  formLayout: {
    flex: 1
  },
  form: {
    alignSelf: 'center',
    paddingTop: 2 * BASIC_SPACING
  },
  input: {
    borderWidth: 1,
    borderColor: 'black',
    marginBottom: 3,
    padding: 3
  },
  main: {
    flex: 1,
  },
  column: {
    backgroundColor: COLORS.PRIMARY_BLUE,
    flexDirection: 'column',
    paddingTop: BASIC_SPACING,
    flex: 1
  },
  list: {
    paddingLeft: BASIC_SPACING
  },
  channels: {
    backgroundColor: COLORS.SECONDARY_BLUE,
    paddingVertical: BASIC_SPACING / 2,
    marginVertical: BASIC_SPACING
  },
  main: {
    flex: 1,
    flexDirection: 'column'
  },
  scrollContent: {
    paddingBottom: 80,
  },
  addPeer: {
    fontSize: 12,
    padding: BASIC_SPACING / 2
  },
  addPeerSelected: {
    fontWeight: 'bold'
  },
  addPeerDisabled: {
    fontStyle: 'italic'
  },
  menuItemText: {
    color: 'white',
    marginLeft: BASIC_SPACING / 2,
    overflow: 'hidden'
  },
  menuItemTextOpen: {
    color: 'black'
  },
  menuItemTouchable: {
    padding: BASIC_SPACING / 2,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  menuItemTouchableOpen: {
    backgroundColor: 'white'
  },
  mainframe: {
    height: 82,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: BASIC_SPACING,
    paddingBottom: 6,
    paddingTop: BASIC_SPACING,
    backgroundColor: '#09142E',
  },
  poweredText: {
    color: COLORS.WHITE,
    fontSize: 11,
    padding: 0,
    margin: 0,
  },
})

const HomeQuery = graphql(
  gql`
    ${ConvoMeta}
    ${ProfileData}
    query HomeQuery {
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
              channels: subscriptionData.data.channelsChanged.channels
            }
          })
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
            viewer: {
              ...prev.viewer,
              contacts: subscriptionData.data.contactsChanged.contacts
            }
          })
        })
    })
  }
)

const HomeWithData = compose(HomeQuery)(HomeScreen)

const HomeComposeContainer = compose(HomeQuery)(HomeScreen)

export default connect(null, { navOpen })(HomeComposeContainer)
