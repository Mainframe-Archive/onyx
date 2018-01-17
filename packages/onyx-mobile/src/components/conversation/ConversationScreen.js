// @flow

import bytes from 'bytes'
import { groupBy, throttle } from 'lodash'
import { connect } from 'react-redux'
import Moment from 'moment'
import PropTypes from 'prop-types'
import React, { Component, type Element } from 'react'
import { compose, gql, graphql, type ApolloClient } from 'react-apollo'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ListView,
  TextInput,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  Platform,
} from 'react-native'

import { navBack } from '../../data/actions/navigation'
import { MessageData, ProfileData } from '../../data/graphql/fragments'
import {
  SendMessageMutation,
  SetTypingMutation,
  UpdatePointerMutation,
  type SendMessageFunc,
  type SetTypingFunc,
  type UpdatePointerFunc
} from '../../data/graphql/mutations'

import Loader from '../shared/Loader'
import Avatar from '../shared/Avatar'
import Text from '../shared/Text'
import Icon from '../shared/Icon'
import ParticipantsModal from './ParticipantsModal'
// import UserProfile from './UserProfile'

import COLORS from '../colors'
import { BASIC_SPACING } from '../styles'

type File = {
  hash: string,
  mimeType: string,
  name: string,
  size: number
}

type FileBlock = {
  file: File
}

type TextBlock = {
  text: string
}

type MessageProps = {
  hasPointer: boolean,
  isSender: boolean,
  dark?: boolean,
  message: {
    blocks: Array<FileBlock | TextBlock>,
    timestamp: number
  },
  profile: {
    id: string,
    avatar: ?string,
    name: ?string
  },
  onPressProfile: (profile: Object) => void
}

const SUPPORTED_FILE_ICONS = {
  'application/pdf': {
    name: 'acrobat',
    iconSet: 'zocial',
  },
  'image/': {
    name: 'acrobat',
    iconSet: 'zocial',
  },
  'generic': {
    name: 'acrobat',
    iconSet: 'zocial',
  }
}

class MessageRow extends Component<MessageProps> {
  render() {
    const { isSender, message, onPressProfile, profile, dark } = this.props
    const sender = isSender ? 'You' : profile.name || profile.id.substr(0, 8)
    const time = Moment(message.timestamp)

    const blocks = groupBy(message.blocks, '__typename')
    const text =
      blocks.MessageBlockText && // $FlowFixMe
      blocks.MessageBlockText.map(b => b.text).join('\n')

      const file =
        blocks.MessageBlockFile &&
        blocks.MessageBlockFile[0] && // $FlowFixMe
        blocks.MessageBlockFile[0].file

      const onPressFile = file
        ? () => {
          Alert.alert(
            `Coming soon!`,
            `Viewing attachments isn't supported on mobile yet sorry.`,
            [{text: 'OK'}],
          )
        } : null

      const fileNameStyles = dark
        ? [styles.fileDownloadName, styles.whiteText]
        : styles.fileDownloadName

      let iconProps
      if (file) {
        switch (file.mimeType) {
          case 'application/pdf':
            iconProps = {
              name: 'acrobat',
              iconSet: 'zocial',
            }
            break
          case 'image/png':
          case 'image/jpg':
          case 'image/jpeg':
            iconProps = {
              name: 'image',
              iconSet: 'zocial',
            }
            break
          default:
            iconProps = {
              name: 'attachment',
              iconSet: 'entypo',
            }
        }
      }

      const dims = Dimensions.get('window')
      const fileDownloadStyles = [styles.fileDownload, {width: dims.width - (BASIC_SPACING * 4)}]

      const fileDesc = file ? (
        <TouchableOpacity onPress={onPressFile} style={fileDownloadStyles}>
          <View style={styles.fileIcon}>
            <Icon size={20} color={COLORS.WHITE} {...iconProps} />
          </View>
          <View style={styles.fileDownloadText}>
            <Text style={fileNameStyles} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.fileDownloadSize}>{bytes(file.size)}</Text>
          </View>
          <Icon name="md-arrow-round-down" size={22} color={COLORS.RED} />
        </TouchableOpacity>
      ) : null

    const openProfile = () => {
      onPressProfile(profile)
    }

    const textStyles = [styles.messageBody]
    if (dark) {
      textStyles.push(styles.whiteText)
    }

    return (
      <View style={styles.message}>
        <TouchableOpacity onPress={openProfile} style={styles.messageAvatar}>
          <Avatar profile={profile} size={40} />
        </TouchableOpacity>
        <View style={styles.messageBody}>
          <View style={styles.messageProfile}>
            <TouchableOpacity onPress={openProfile}>
              <Text style={styles.messageSender} fontStyle="semi-bold">{sender}</Text>
            </TouchableOpacity>
            <Text style={styles.messageTime}>{time.calendar()}:</Text>
          </View>
          <Text style={textStyles}>{text}</Text>
          {fileDesc}
        </View>
      </View>
    )
  }
}

type UnsubscribeFunc = () => void
type SubscribeFunc = (id: string) => UnsubscribeFunc

type Props = {
  data: Object,
  id: string,
  sendMessage: SendMessageFunc,
  setTyping: SetTypingFunc,
  updatePointer: UpdatePointerFunc,
  subscribeToMessageAdded: SubscribeFunc,
  subscribeToTypingsChanged: SubscribeFunc,
  navBack: () => void
}

type Context = {
  client: ApolloClient
}

type State = {
  editorState: EditorState,
  file: ?File,
  typingText: string,
  openProfile: ?Object
}

class ConversationScreen extends Component<Props, State> {
  static contextTypes = {
    client: PropTypes.object.isRequired
  }

  editor: ?Element<typeof Editor>
  list: ?Element<typeof VirtualizedList>
  typing: boolean = false
  typingTimer: ?number
  unsubscribeMessageAdded: UnsubscribeFunc
  unsubscribeTypingsChanged: UnsubscribeFunc

  constructor(props: Props, context: Context) {
    super(props, context)
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 })
    const data = props.data.conversation ? props.data.conversation.messages : []
    this.state = {
      file: undefined,
      typingText: '',
      openProfile: null,
      dataSource: ds.cloneWithRows(data)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.data.conversation !== this.props.data.conversation) {
      const messages = nextProps.data.conversation.messages
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(messages)
      })
    }
  }

  bindList = (list: ?Element) => {
    this.list = list
  }

  componentDidMount() {
    this.unsubscribeMessageAdded = this.props.subscribeToMessageAdded(
      this.props.id
    )
    this.unsubscribeTypingsChanged = this.context.client
      .subscribe({
        query: gql`
          ${ProfileData}
          subscription TypingsChangedSubscription ($id: ID!) {
            typingsChanged(id: $id) {
              ...ProfileData
            }
          }
        `,
        variables: { id: this.props.id }
      })
      .subscribe({
        next: ({ typingsChanged }) => {
          const toBe = typingsChanged.length > 1 ? 'are' : 'is'
          const typingText =
            typingsChanged.length > 0
              ? typingsChanged
                  .map(p => p.name || p.id.substr(0, 8))
                  .join(' and ') + ` ${toBe} typing`
              : ''
          this.setState(
            s => (s.typingText === typingText ? null : { typingText })
          )
        }
      }).unsubscribe

    this.props.updatePointer(this.props.id)
  }

  componentWillUnmount() {
    if (this.typingTimer != null) {
      clearTimeout(this.typingTimer)
    }
    this.unsubscribeMessageAdded()
    this.unsubscribeTypingsChanged()
  }

  setTyping = throttle(() => {
    if (!this.typingTimer) {
      this.props.setTyping({ convoID: this.props.id, typing: true })
    }
    this.typingTimer = setTimeout(this.clearTyping, 2000)
  }, 500)

  clearTyping = () => {
    this.props.setTyping({ convoID: this.props.id, typing: false })
  }

  toggleTyping = (typing: boolean) => {
    const hasTyping = this.typingTimer != null
    if (hasTyping) {
      clearTimeout(this.typingTimer)
      this.typingTimer = undefined
    }
    if (typing) {
      this.setTyping()
    } else if (hasTyping) {
      this.clearTyping()
    }
  }

  onSend = () => {
    const { messageText } = this.state
    if (messageText && messageText.length) {
      this.props.sendMessage({
        blocks: [{
          text: messageText,
        }],
        convoID: this.props.id
      })
      this.setState({
        messageText: '',
      })
    }
  }

  sendMessage = () => {
    const { editorState, file } = this.state
    // const text = editorState.getCurrentContent().getPlainText()
    const text = 'test'
    if (text.length > 0) {
      const blocks = [{ text }]
      if (file != null) {
        blocks.push({ file })
      }
      this.props.sendMessage({ blocks, convoID: this.props.id })
      // Reset input
      // this.setState(
      //   { editorState: EditorState.createEmpty(), file: undefined },
      //   () => {
      //     this.focusEditor()
      //   },
      // )
    }
  }

  onChangeText = (value: string) => {
    this.setState({
      messageText: value
    })
    this.toggleTyping(
      value.length > 0,
    )
  }

  // TODO: better way to retrieve peers, they could be stored in a Map
  getPeer(id: string) {
    const { data } = this.props
    if (id === data.viewer.profile.id) {
      return data.viewer
    }
    return data.conversation.peers.find(c => c.profile.id === id)
  }

  showProfile = (openProfile: Object) => {
    this.setState({ openProfile })
  }

  hideProfile = () => {
    this.setState({ openProfile: null })
  }

  showMyProfile = () => {
    this.showProfile(this.props.data.viewer.profile)
  }

  onPressParticipants = () => {
    this.setState({ openModal: 'participants' })
  }

  closeModal = () => {
    this.setState({ openModal: null })
  }

  // RENDER

  renderRow = (row, index) => {
    const { data } = this.props
    const message = row
    let contents
    if (message != null) {
      const peer = message.sender && this.getPeer(message.sender)
      if (peer != null) {
        contents = (
          <MessageRow
            hasPointer={index === data.conversation.pointer}
            isSender={peer.profile.id === data.viewer.profile.id}
            message={message}
            profile={peer.profile}
            onPressProfile={this.showProfile}
            dark={data.conversation.dark}
          />
        )
      } else {
        console.warn('Peer not found for message', message)
      }
    }

    return <View key={index}>{contents}</View>
  }

  renderProfileModal() {
    const { openProfile } = this.state
    return null
    // return <UserProfile profile={openProfile} onCloseModal={this.hideProfile} />
  }

  renderParticipantsModal() {
    const { data } = this.props
    return this.state.openModal === 'participants' ? (
      <ParticipantsModal
        onRequestClose={this.closeModal}
        participants={data.conversation.peers}/>
    ) : null
  }

  render() {
    const { data } = this.props
    const { typingText } = this.state

    if (data == null || data.conversation == null) {
      return <Loader />
    }

    const dark = data.conversation.dark

    let subject = ''
    if (data.conversation.type === 'CHANNEL') {
      subject = `#${data.conversation.subject}`
      if (dark) {
        subject += ' (dark)'
      }
    } else if (
      data.conversation.peers[0] &&
      data.conversation.peers[0].profile
    ) {
      subject =
        data.conversation.peers[0].profile.name ||
        data.conversation.peers[0].profile.id.substr(0, 8)
    }

    const typingIndicator = typingText ? (
      <View style={styles.typing}>
        <Text style={styles.typingText} numberOfLines={1}>
          {typingText}
        </Text>
      </View>
    ) : null

    const subjectStyles = [styles.title]
    const containerStyles = [styles.container]
    const inputContainerStyles = [styles.inputContainer]
    const headerStyles = [styles.header]

    if (dark) {
      subjectStyles.push(styles.whiteText)
      containerStyles.push(styles.darkBg)
      inputContainerStyles.push(styles.darkInputContainer)
      headerStyles.push(styles.darkHeader)
    }

    const content = (
      <View style={containerStyles}>
        <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
        {this.renderProfileModal()}
        {this.renderParticipantsModal()}
        <View style={headerStyles}>
          <TouchableOpacity
            onPress={this.props.navBack}
            style={styles.backButton}
          >
            <Icon
              name={'ios-arrow-back'}
              size={32}
              color={COLORS.PRIMARY_RED}
            />
          </TouchableOpacity>
          <View style={styles.channelInfo}>
            <Text numberOfLines={1} style={subjectStyles}>
              {subject}
            </Text>
            <Text style={styles.subtitle}>
              {data.conversation.type === 'CHANNEL'
                ? 'Channel'
                : 'Direct Message'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={this.onPressParticipants}
            style={styles.participants}
          >
            <Icon iconSet="awesome" name="user" size={20} color={COLORS.PRIMARY_RED} />
            <Text style={styles.peopleCount}>
              {data.conversation.peers.length + 1}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.messages}>
          <ListView
            enableEmptySections
            contentContainerStyle={styles.listInner}
            dataSource={this.state.dataSource}
            ref={this.bindList}
            renderRow={this.renderRow}
          />
        </View>
        {typingIndicator}
        <View style={inputContainerStyles}>
          <TextInput
            placeholder="Type your message"
            style={styles.input}
            value={this.state.messageText}
            onChangeText={this.onChangeText}
            multiline
          />
          <View style={styles.inputBarRight}>
            <TouchableOpacity onPress={this.onSend} style={styles.sendButton}>
              <Icon name={'md-arrow-round-up'} size={26} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )

    return Platform.OS === 'ios' ? (
      <KeyboardAvoidingView behavior="padding" style={containerStyles}>
        {content}
      </KeyboardAvoidingView>
    ) : (
      <View style={containerStyles}>
        {content}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: COLORS.WHITE
  },
  darkBg: {
    backgroundColor: COLORS.DARK_THEME_BG
  },
  header: {
    borderBottomColor: COLORS.GRAY_E6,
    borderBottomWidth: 1,
    paddingTop: BASIC_SPACING * 1.5,
    paddingBottom: BASIC_SPACING / 2,
    paddingHorizontal: BASIC_SPACING,
    flexDirection: 'row',
    alignItems: 'center'
  },
  darkHeader: {
    borderBottomColor: COLORS.DARKEST_BLUE,
  },
  title: {
    fontSize: 20
  },
  whiteText: {
    color: COLORS.WHITE,
  },
  backButton: {
    width: 35,
  },
  channelInfo: {
    flex: 1
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.LIGHTEST_BLUE
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_RED,
  },
  peopleCount: {
    marginLeft: 7,
    fontSize: 15,
    color: COLORS.PRIMARY_RED,
  },
  avatar: {
    marginLeft: BASIC_SPACING / 2
  },
  listInner: {
    paddingBottom: BASIC_SPACING / 2
  },
  messages: {
    flex: 1
  },
  message: {
    paddingHorizontal: BASIC_SPACING,
    flexDirection: 'row',
    paddingTop: BASIC_SPACING / 2
  },
  messageAvatar: {
    marginRight: BASIC_SPACING / 2
  },
  messageProfile: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  messageBody: {
    flexDirection: 'column'
  },
  messageSender: {
    color: COLORS.LIGHTEST_BLUE,
    fontSize: 14,
    fontWeight: '500'
  },
  messageTime: {
    marginLeft: BASIC_SPACING / 2,
    color: COLORS.MEDIUM_GRAY,
    fontSize: 11
  },
  typing: {
    height: 35,
    paddingHorizontal: BASIC_SPACING / 2,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  typingText: {
    color: COLORS.GRAY_98,
    fontSize: 12
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: BASIC_SPACING / 2,
  },
  darkInputContainer: {
    backgroundColor: COLORS.DARKEST_BLUE,
  },
  input: {
    backgroundColor: COLORS.WHITE,
    padding: BASIC_SPACING * 0.6,
    paddingTop: 12,
    borderRadius: 5,
    maxHeight: 150,
    fontSize: 15,
    flex: 1
  },
  inputBarRight: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  sendButton: {
    backgroundColor: COLORS.PRIMARY_RED,
    marginLeft: BASIC_SPACING / 2,
    marginBottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileDownload: {
    flexDirection: 'row',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.RED,
    padding: BASIC_SPACING * 0.3,
    paddingRight: BASIC_SPACING,
    borderRadius: 50,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: BASIC_SPACING / 2,
    marginRight: BASIC_SPACING,
  },
  fileDownloadText: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: BASIC_SPACING / 2,
  },
  fileDownloadName: {
    fontSize: 13,
    color: COLORS.GRAY_23,
  },
  fileDownloadSize: {
    fontSize: 12,
    color: COLORS.MEDIUM_GRAY,
  },
  fileIcon: {
    backgroundColor: COLORS.RED,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
})

const ConvoQuery = graphql(
  gql`
  ${MessageData}
  ${ProfileData}
  query ConversationQuery ($id: ID!) {
    conversation(id: $id) {
      type
      subject
      messages {
        ...MessageData
      }
      peers {
        profile {
          ...ProfileData
        }
        state
      }
      pointer
      lastActiveTimestamp
      dark
    }

    viewer {
      profile {
        ...ProfileData
      }
    }
  }
`,
  {
    options: props => ({
      variables: {
        id: props.id,
      },
      fetchPolicy: 'network-only',
    }),
    props: ({ data }) => ({
      data,
      subscribeToMessageAdded: (id: string) =>
        data.subscribeToMore({
          document: gql`
            ${MessageData}
            subscription MessageAddedSubscription ($id: ID!) {
              messageAdded(id: $id) {
                conversation {
                  pointer
                  lastActiveTimestamp
                }
                message {
                  ...MessageData
                }
              }
            }
          `,
          variables: { id },
          updateQuery: (prev, { subscriptionData }) => ({
            conversation: {
              ...prev.conversation,
              ...subscriptionData.data.messageAdded.conversation,
              messages: [
                ...prev.conversation.messages,
                subscriptionData.data.messageAdded.message
              ]
            },
            viewer: prev.viewer
          })
        })
    })
  }
)

// $FlowFixMe
const ConvoCompose = compose(
  SetTypingMutation,
  SendMessageMutation,
  UpdatePointerMutation,
  ConvoQuery
)(ConversationScreen)

export default connect(null, { navBack })(ConvoCompose)
