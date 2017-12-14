// @flow
import React, { Component } from 'react'
import HomeScreen from '../components/home/HomeScreen'
import NodeSelectionScreen from '../components/NodeSelectionScreen'
import ContactScreen from '../components/contacts/ContactScreen'
import ConversationScreen from '../components/conversation/ConversationScreen'

const mapNavigationStateParamsToProps = (ScreenComponent) => {
  return class extends Component {
    static navigationOptions = ScreenComponent.navigationOptions
    render() {
      const { params } = this.props.navigation.state
      return <ScreenComponent {...this.props} {...params} />
    }
  }
}

const routes = {
  Home: { screen: HomeScreen, navigationOptions: { header: null } },
  NodeSelection: { screen: NodeSelectionScreen },
  Conversation: {
    screen: mapNavigationStateParamsToProps(ConversationScreen),
    navigationOptions: { header: null },
  },
}

export default routes
