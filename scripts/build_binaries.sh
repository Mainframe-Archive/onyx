#!/usr/bin/env bash

set -x

if [ "$(uname)" == "Darwin" ];
then
    OS=mac
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ];
then
    OS=linux
else
  echo "Platform not supported"
  exit 1
fi

GIT_REF=onyx-0.5
ROOT_DIR=$(pwd)
BIN_DIR=$ROOT_DIR/bin
TMP_DIR=$ROOT_DIR/tmp

TARGETS=linux/amd64,darwin/amd64,windows/amd64

mkdir -p $BIN_DIR
mkdir -p $TMP_DIR

if [[ ! -e $TMP_DIR/go-ethereum ]]; then
    cd $TMP_DIR
    echo "cloning the go-ethereum repo"
    git clone --depth 1 https://github.com/MainframeHQ/go-ethereum.git -b pss
fi

cd $TMP_DIR/go-ethereum

git fetch --depth 1 origin $GIT_REF
git checkout $GIT_REF

if [[ $1 == "-mwl" ]]
then
    ./build/env.sh go run build/ci.go xgo -- --go=latest --targets=$TARGETS -v ./cmd/geth
    ./build/env.sh go run build/ci.go xgo -- --go=latest --targets=$TARGETS -v ./cmd/swarm

    cp build/bin/geth-linux-* $BIN_DIR/geth-linux
    cp build/bin/geth-darwin-* $BIN_DIR/geth-mac
    cp build/bin/geth-windows-* $BIN_DIR/geth-win.exe
    cp build/bin/swarm-linux-* $BIN_DIR/swarm-linux
    cp build/bin/swarm-darwin-* $BIN_DIR/swarm-mac
    cp build/bin/swarm-windows-* $BIN_DIR/swarm-win.exe
else
    ./build/env.sh go run build/ci.go install ./cmd/geth
    ./build/env.sh go run build/ci.go install ./cmd/swarm

    cp build/bin/geth $BIN_DIR/geth-$OS
    cp build/bin/swarm $BIN_DIR/swarm-$OS
fi

set +x
