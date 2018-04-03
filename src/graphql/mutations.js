// @flow

import { gql, graphql } from 'react-apollo'

import { ProfileData } from './fragments'

export type ID = string

export type AcceptContactFunc = (id: ID) => Promise<*>

export const AcceptContactMutation = graphql(
  gql`
    ${ProfileData}
    mutation AcceptContactMutation($id: ID!) {
      acceptContact(id: $id) {
        profile {
          ...ProfileData
        }
        state
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      acceptContact: (id: ID) => mutate({ variables: { id } }),
    }),
  },
)

export type ChannelInput = {
  subject: string,
  peers: Array<ID>,
}

export type CreateChannelFunc = (input: ChannelInput) => Promise<*>

export const CreateChannelMutation = graphql(
  gql`
    mutation CreateChannelMutation($input: ChannelInput!) {
      createChannel(input: $input) {
        id
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      createChannel: (input: ChannelInput) => mutate({ variables: { input } }),
    }),
  },
)

export type RequestContactFunc = (id: ID) => Promise<*>

export const RequestContactMutation = graphql(
  gql`
    mutation RequestContactMutation($id: ID!) {
      requestContact(id: $id) {
        profile {
          id
        }
        state
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      requestContact: (id: ID) => mutate({ variables: { id } }),
    }),
  },
)

export type MessageInput = {
  convoID: ID,
  blocks: Array<Object>,
}

export type SendMessageFunc = (input: MessageInput) => Promise<*>

export const SendMessageMutation = graphql(
  gql`
    mutation SendMessageMutation($input: MessageInput!) {
      sendMessage(input: $input) {
        timestamp
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      sendMessage: (input: MessageInput) => mutate({ variables: { input } }),
    }),
  },
)

export type TypingInput = {
  convoID: ID,
  typing: boolean,
}

export type SetTypingFunc = (input: TypingInput) => Promise<*>

export const SetTypingMutation = graphql(
  gql`
    mutation SetTypingMutation($input: TypingInput!) {
      setTyping(input: $input) {
        lastActiveTimestamp
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      setTyping: (input: TypingInput) => mutate({ variables: { input } }),
    }),
  },
)

export type UpdatePointerFunc = (id: ID) => Promise<*>

export const UpdatePointerMutation = graphql(
  gql`
    mutation UpdatePointerMutation($id: ID!) {
      updatePointer(id: $id) {
        pointer
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      updatePointer: (id: ID) => mutate({ variables: { id } }),
    }),
  },
)

export type UpdateProfileFunc = (input: ProfileInput) => Promise<*>

export const UpdateProfileMutation = graphql(
  gql`
    mutation UpdateProfileMutation($input: ProfileInput!) {
      updateProfile(input: $input) {
        name
        bio
        avatar
        hasStake
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      updateProfile: (input: ProfileInput) => mutate({
        variables: { input },
        updateQueries: {
          AppQuery: (state, { mutationResult }) => {
            const profile = Object.assign(state.viewer.profile, mutationResult.data.updateProfile)
            const nextViewer = Object.assign(state.viewer, { profile })
            return {...state, viewer: nextViewer}
          },
        }
      }),
    }),
  },
)

export type resendInvites = (id: ID) => Promise<*>

export const ResendInvitesMutation = graphql(
  gql`
    mutation ResendInvitesMutation($id: ID!) {
      resendInvites(id: $id) {
        id
      }
    }
  `,
  {
    props: ({ mutate }) => ({
      resendInvites: (id: ID) => mutate({ variables: { id } }),
    }),
  }
)
