// @flow

import React, { Component } from 'react'
import { compose, gql, graphql } from 'react-apollo'
import { Button, StyleSheet, View } from 'react-native'
import Text from '../shared/Text'

import { ProfileData } from '../../data/graphql/fragments'
import {
  AcceptContactMutation,
  RequestContactMutation,
  type AcceptContactFunc,
  type RequestContactFunc,
} from '../../data/graphql/mutations'

// import Conversation from './Conversation'
import Loader from '../shared/Loader'

type UnsubscribeFunc = () => void
type SubscribeFunc = (id: string) => UnsubscribeFunc

type Props = {
  acceptContact: AcceptContactFunc,
  data: Object,
  id: string,
  requestContact: RequestContactFunc,
  subscribeToContactChanged: SubscribeFunc,
}

class ContactScreen extends Component<Props> {
  unsubscribeContactChanged: UnsubscribeFunc

  componentDidMount() {
    console.log('did mount: ', this.props.id)
    // this.unsubscribeContactChanged = this.props.subscribeToContactChanged(
    //   this.props.id,
    // )
  }

  componentWillUnmount() {
    // this.unsubscribeContactChanged()
  }

  onPressAccept = () => {
    this.props.acceptContact(this.props.data.contact.profile.id)
  }

  onPressRequest = () => {
    this.props.requestContact(this.props.data.contact.profile.id)
  }

  render() {
    const { data } = this.props

    if (data == null || data.contact == null) {
      return <Loader />
    }

    switch (data.contact.state) {
      case 'ACCEPTED':
        // return <Conversation id={data.contact.convoID} />
        return (
          <View>
            <Text>Contact accepted</Text>
          </View>
        )
      case 'RECEIVED':
        return (
          <View>
            <Text>Contact request received</Text>
            <Button onPress={this.onPressAccept} title="Accept contact" />
          </View>
        )
      case 'SENT':
        return (
          <View>
            <Text>Contact request sent</Text>
            <Button onPress={this.onPressRequest} title="Send again" />
          </View>
        )
      default:
        return (
          <View>
            <Text>Not a contact, send request?</Text>
            <Button
              onPress={this.onPressRequest}
              title="Send contact request"
            />
          </View>
        )
    }
  }
}

const styles = StyleSheet.create({})

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

export default compose(
  AcceptContactMutation,
  RequestContactMutation,
  ContactQuery,
)(ContactScreen)
