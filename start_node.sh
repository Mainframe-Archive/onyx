#!/usr/bin/env bash

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <go-ethereum-directory> <data-directory>"
  exit 1
fi

GODIR="$1"
DATADIR="$2"

pushd "$GODIR"
git checkout 8bdcd40bc2e04533862be901b604cea886cca383
make geth
make swarm
popd

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
    echo "ERROR: jq is required to run the startup script"
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

