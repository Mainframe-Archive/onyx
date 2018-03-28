// @flow

import React, { Component } from 'react'
import { compose, gql, graphql } from 'react-apollo'
import { StyleSheet, View } from 'react-native-web'
import PropTypes from 'prop-types'

import { ProfileData } from '../graphql/fragments'
import {
  AcceptContactMutation,
  RequestContactMutation,
  type AcceptContactFunc,
  type RequestContactFunc,
} from '../graphql/mutations'

import Conversation from './Conversation'
import Loader from './Loader'
import UserProfile from './UserProfile'
import Button from './Form/Button'
import Text from './Text'

import { BASIC_SPACING } from '../styles'

type UnsubscribeFunc = () => void
type SubscribeFunc = (id: string) => UnsubscribeFunc

type Props = {
  acceptContact: AcceptContactFunc,
  data: Object,
  id: string,
  requestContact: RequestContactFunc,
  subscribeToContactChanged: SubscribeFunc,
}

class Contact extends Component<Props> {
  static contextTypes = {
    wsConnected$: PropTypes.object.isRequired,
  }

  unsubscribeContactChanged: ?UnsubscribeFunc

  componentWillReceiveProps(nextProps) {
    if (nextProps.data && !this.unsubscribeContactChanged) {
      this.unsubscribeContactChanged = this.props.subscribeToContactChanged(
        this.props.id,
      )
    }
  }

  componentWillUnmount() {
    if (this.context.wsConnected$.value && this.unsubscribeContactChanged) {
      this.unsubscribeContactChanged()
    }
  }

  onPressAccept = () => {
    this.props.acceptContact(this.props.data.contact.profile.id)
  }

  onPressRequest = () => {
    this.props.requestContact(this.props.data.contact.profile.id)
  }

  renderButton() {
    const { data } = this.props

    switch (data.contact.state) {
      case 'RECEIVED':
        return <Button onPress={this.onPressAccept} title="Accept" />
      case 'SENT':
        return data.contact.profile.hasStake ? (
          <Button onPress={this.onPressRequest} title="Resend Invitation" />
        ) : (
          <Button disabled title="Resend disabled - user hasn't staked" />
        )
      default:
        return (
          <Button onPress={this.onPressRequest} title="Send contact request" />
        )
    }
  }

  render() {
    const { data } = this.props

    if (data == null || data.contact == null) {
      return (
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      )
    }

    if (data.contact.state === 'ACCEPTED') {
      return <Conversation id={data.contact.convoID} />
    }

    const { profile } = data.contact

    return (
      <View className="profile" style={styles.container}>
        <UserProfile profile={profile} />
        <View style={styles.button}>{this.renderButton()}</View>
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
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginTop: 3 * BASIC_SPACING,
    width: '50vw',
    minWidth: 450,
    maxWidth: 600,
  },
})

const ContactData = gql`
  ${ProfileData}
  fragment ContactData on Contact {
    profile {
      ...ProfileData
    }
    state
    convoID
  }
`

const ContactQuery = graphql(
  gql`
    ${ContactData}
    query ContactQuery($id: ID!) {
      contact(id: $id) {
        ...ContactData
      }
    }
  `,
  {
    options: props => ({
      variables: {
        id: props.id,
      },
    }),
    props: ({ data }) => ({
      data,
      subscribeToContactChanged: (id: string) =>
        data.subscribeToMore({
          document: gql`
            ${ContactData}
            subscription ContactChangedSubscription ($id: ID!) {
              contactChanged(id: $id) {
                ...ContactData
              }
            }
          `,
          variables: { id },
          updateQuery: (prev, { subscriptionData }) => ({
            contact: {
              ...prev.contact,
              ...subscriptionData.data.contactChanged,
            },
          }),
        }),
    }),
  },
)

// $FlowFixMe
export default compose(
  AcceptContactMutation,
  RequestContactMutation,
  ContactQuery,
)(Contact)
