#!/usr/bin/env bash

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <data-directory>"
  exit 1
fi

DATADIR="$1"
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
GODIR="$SCRIPTPATH/build/go-ethereum"

if [[ ! -e $SCRIPTPATH/build/go-ethereum ]]; then
    echo "cloning the go-ethereum repo"
    cd "$SCRIPTPATH/build"
    git clone https://github.com/nolash/go-ethereum.git
fi

cd "$GODIR"
# doing the fetch here and now makes sure that we can change the chosen
# commit hash without the risk of breaking the script
git fetch
git checkout 8bdcd40bc2e04533862be901b604cea886cca383
make geth
make swarm

if [[ ! -e $DATADIR/keystore ]]; then
  mkdir -p $DATADIR
  echo 'secret' > $DATADIR/password
  $GODIR/build/bin/geth --datadir $DATADIR account new --password $DATADIR/password
fi

which jq
if [ $? -eq 0 ]
then
    KEY=$(jq --raw-output '.address' $DATADIR/keystore/*)
else
    printf "\n\nERROR: jq is required to run the startup script\n\n"
    exit 1
fi

$GODIR/build/bin/swarm \
    --datadir $DATADIR \
    --password $DATADIR/password \
    --verbosity 4 \
    --bzzaccount $KEY \
    --pss \
    --bzznetworkid 922 \
    --bootnodes enode://e834e83b4ed693b98d1a31d47b54f75043734c6c77d81137830e657e8b005a8f13b4833efddbd534f2c06636574d1305773648f1f39dd16c5145d18402c6bca3@54.171.164.15:30399 \
    --ws \
    --wsorigins '*'

