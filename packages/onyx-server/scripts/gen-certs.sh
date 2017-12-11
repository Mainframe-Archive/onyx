#!/usr/bin/env bash

mkdir ./certs
openssl req -new -x509 -days 9999 -config ./cert-configs/ca.cnf -keyout ./certs/ca-key.pem -out ./certs/ca-crt.pem -passout pass:password
openssl genrsa -out ./certs/server-key.pem 4096
openssl req -new -config ./cert-configs/server.cnf -key ./certs/server-key.pem -out ./certs/server-csr.pem
openssl x509 -req -extfile ./cert-configs/server.cnf -days 999 -in ./certs/server-csr.pem -CA ./certs/ca-crt.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/server-crt.pem -passin pass:password
openssl genrsa -out ./certs/client-key.pem 4096
openssl req -new -config ./cert-configs/client.cnf -key ./certs/client-key.pem -out ./certs/client-csr.pem
openssl x509 -req -extfile ./cert-configs/client.cnf -days 999 -in ./certs/client-csr.pem -CA ./certs/ca-crt.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/client-crt.pem -passin pass:password
