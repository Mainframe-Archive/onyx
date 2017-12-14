// @flow
import React, { Component } from 'react'
import { StyleSheet, Alert, TouchableOpacity, View, ScrollView } from 'react-native'

import Modal from '../shared/Modal'
import Avatar from '../shared/Avatar'
import Text from '../shared/Text'
import colors from '../colors'

type Props = {
  participants: Array<Object>,
  onPressProfile: (id: string) => void,
  onRequestClose: () => void,
}

export default class ParticipantsModal extends Component<Props> {

  // HANDLERS

  // RENDER

  render () {
    return(
      <Modal
        title="Participants"
        visible={this.props.visible}
        onRequestClose={this.props.onRequestClose}
        >
        <ScrollView style={styles.container}>
          {
            this.props.participants.map((p, i) => {
              const rowStyles = [styles.row]
              if (i !== this.props.participants.length - 1) {
                rowStyles.push(styles.marginBottom)
              }
              return (
                <View style={rowStyles}>
                  <Avatar profile={p.profile}/>
                  <Text style={styles.name}>{p.profile.name || p.profile.id}</Text>
                </View>
              )
            })
          }
        </ScrollView>
      </Modal>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomMargin: {
    marginBottom: 10,
  },
  name: {
    paddingLeft: 10,
  },
})
