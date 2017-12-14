#!/usr/bin/env bash

usage() { echo "Usage: $0 -p <certificate-password> -i <ip-address-to-certify> -d <domain-to-certify>" 1>&2; exit 1; }

SCRIPT_DIR="$( cd "$(dirname "$0")" ; pwd -P )"
CERT_CONFIG_DIR="$SCRIPT_DIR"/../cert-configs

while getopts ":p:i:d:" o; do
  case "$o" in
    p)
      PASSWORD=$OPTARG
      ;;
    i)
      IP_ADDRESS=$OPTARG
      ;;
    d)
      DOMAIN=$OPTARG
      ;;
    *)
      usage
      ;;
  esac
done

if [ -z "$PASSWORD" ]
then
  PASSWORD=$(cat /dev/urandom | env LC_CTYPE=C LC_ALL=C tr -dc 'a-zA-Z0-9' | head -c 32)
fi

if [ -n "$IP_ADDRESS" ]
then
  ALT_NAMES="IP.2 = $IP_ADDRESS\n"
fi

if [ -n "$DOMAIN" ]
then
  ALT_NAMES="${ALT_NAMES}DNS.1 = $DOMAIN\n"
fi


mkdir ./certs
echo "$PASSWORD" > ./certs/password

openssl req -new -x509 -days 9999 -config $CERT_CONFIG_DIR/ca.cnf -keyout ./certs/ca-key.pem -out ./certs/ca-crt.pem -passout pass:$PASSWORD
openssl genrsa -out ./certs/server-key.pem 4096
openssl req -new -config <(cat $CERT_CONFIG_DIR/server.cnf <(printf "$ALT_NAMES")) -extensions v3_req -key ./certs/server-key.pem -out ./certs/server-csr.pem
openssl x509 -req -extfile <(cat $CERT_CONFIG_DIR/server.cnf <(printf "$ALT_NAMES")) -extensions v3_req -days 999 -in ./certs/server-csr.pem -CA ./certs/ca-crt.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/server-crt.pem -passin pass:$PASSWORD
openssl genrsa -out ./certs/client-key.pem 4096
openssl req -new -config $CERT_CONFIG_DIR/client.cnf -key ./certs/client-key.pem -out ./certs/client-csr.pem
openssl x509 -req -extfile $CERT_CONFIG_DIR/client.cnf -days 999 -in ./certs/client-csr.pem -CA ./certs/ca-crt.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/client-crt.pem -passin pass:$PASSWORD
openssl pkcs12 -export -out ./certs/client.p12 -inkey certs/client-key.pem -in certs/client-crt.pem -passout pass:$PASSWORD -passin pass:$PASSWORD
