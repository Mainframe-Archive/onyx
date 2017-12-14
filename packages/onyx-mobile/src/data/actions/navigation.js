// @flow

export const navOpen = (routeName: string, params: Object) => {
  return {
    type: 'NAV_OPEN',
    payload: { routeName, data: params},
  };
}

export const navBack = () => {
  return {
    type: 'NAV_BACK',
  };
}
