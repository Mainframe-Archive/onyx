# Onyx Mobile

### Required prerequisites

#### [Homebrew](http://brew.sh/)

```sh
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

#### Node

Install using Homebrew:

```sh
brew install node
```

Or install [nvm](https://github.com/creationix/nvm):

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash
```

and install Node using nvm:

```sh
nvm install 6
```

Install yarn to manage dependencies:
```sh
brew install yarn
```

#### React Native

Follow instructions from [React Native's Getting Started guide](http://facebook.github.io/react-native/docs/getting-started.html).

### Installation

Run

```sh
yarn && brew install watchman
```

to install all the dependencies the first time you use the project.

### Running the App

Use

```sh
yarn run ios
```

or

```sh
yarn run android
```

You can also run the mobile apps from inside Xcode or Android Studio. With Android Studio you will be required to start a node development server independently using `yarn start`.

Be sure to have an emulator running or device connected before running the Android app, you can start an emulator via the terminal with `emulator @my_emulator`, further instructions can be found in the [Android developer docs](https://developer.android.com/studio/run/emulator-commandline.html)

## Connecting to an Onyx Node

The mobile client needs to connect to an Onyx mailboxing server to manage contacts and send and receive messages, the mailboxing service consists of a Blockchain node and graphql server. Please visit the [onyx-server](https://github.com/creationix/nvm) repo for instructions on how to build and deploy your Onyx node.

### Authentication

To establish a secure, encrypted WebSocket connection with the onyx server, the mobile client needs to present a client p12 certificate over TLS. This encrypted certificate along with a password is generated for you when deploying your Onyx node, when connecting to your Onyx server, the client will download the p12 cert and you will be asked to enter the password to decrypt it, so please store your password in a safe place.

## Distribution

### Distributing iOS

At Mainframe we use TestFlight to share iOS builds, please visit [Apple docs](http://help.apple.com/itunes-connect/developer/#/devdc42b26b8) for instructions.

### Distributing Android

The project is setup to allow you to distribute Android builds via Crashlytics, you will be required to add a `fabric.properties` file which contains your fabric api key and secret and also create a keystore file for signing the apk.

the fabric.properties file should be placed in `android/app` and contain:
```
apiSecret=*****
apiKey=******
```

for instructions regarding creating your keystore and signing the apk, please refer to [react native docs](https://facebook.github.io/react-native/docs/signed-apk-android.html).

## License

[MIT](LICENSE)
