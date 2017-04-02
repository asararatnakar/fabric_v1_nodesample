#!/bin/bash

node app/create-channel.js 

node app/join-channel.js

node app/install-chaincode.js

node app/instantiate-chaincode.js

node app/invoke-transaction.js

node app/query.js
