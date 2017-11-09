// @flow

import { gql } from 'react-apollo'

export const ConvoMeta = gql`
  fragment ConvoMeta on Conversation {
    id
    lastActiveTimestamp
    pointer
    messageCount
    subject
  }
`

export const MessageData = gql`
  fragment MessageData on Message {
    sender
    timestamp
    source
    blocks {
      ... on MessageBlockText {
        text
      }
      ... on MessageBlockFile {
        file {
          hash
          name
          mimeType
          size
        }
      }
      ... on MessageBlockAction {
        action {
          id
          assignee
          sender
          state
          text
        }
      }
    }
  }
`

export const ProfileData = gql`
  fragment ProfileData on Profile {
    id
    avatar
    bio
    name
  }
`
