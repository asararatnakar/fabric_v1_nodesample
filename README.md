# Fabric V1 alpha based NodeSDK sample 

The code is from [fabric-sdk-node](https://github.com/hyperledger/fabric-sdk-node.git) repository from e2e integration test code.

### Steps to run the sample

#### STEP1: Clone the repo

```
https://github.com/asararatnakar/fabric_v1_nodesample
```

#### STEP2: Install fabric-client fabric-ca-client node modules

```
cd fabric_v1_nodesample

npm install
```

#### STEP3: Launch the network

```
cd fabric_v1_nodesample/artifacts/

docker-compose up -d
```

### STEP4: execute the applications one after another

**LIMITATION** Unable to execute Join-channel.

Seeing the below error:
```
============ Join Channel ============

[2017-04-01 22:19:42.693] [INFO] Join-Channel - Calling peers in organization "org1" to join the channel
info: [Peer.js]: Peer.const - url: grpcs://localhost:7051 options  grpc.ssl_target_name_override=peer0, grpc.default_authority=peer0
info: [Peer.js]: Peer.const - url: grpcs://localhost:7056 options  grpc.ssl_target_name_override=peer1, grpc.default_authority=peer1
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ratnakar/.hfc-key-store"}}
info: [Client.js]: Successfully loaded user "admin" from local key value store
[2017-04-01 22:19:42.916] [INFO] Helper - Successfully loaded member from persistence
[2017-04-01 22:19:42.916] [INFO] Join-Channel - Successfully enrolled user 'admin'
[2017-04-01 22:19:42.936] [ERROR] Join-Channel - Failed to join peers in organization "peerOrg1" to the channel. TypeError: Cannot read property 'stack' of undefined
    at hfc.newDefaultKeyValueStore.then.then.then (/home/ratnakar/go/src/github.com/hyperledger/fabric/v1Sample/app/join-channel.js:189:61)
[2017-04-01 22:19:42.936] [DEBUG] Join-Channel - 
!!!!!!!! ERROR: Join Channel FAILED !!!!!!!!

```

__**Workaround**__ : execute the join channel alone from [fabric-sdk-node](https://github.com/hyperledger/fabric-sdk-node/blob/master/test/integration/e2e/join-channel.js) repository

```
cd fabric_v1_nodesample/app
```

**CREATE CHANNEL**

`node create-channel.js`

##### ~~~~~~ BELOW IS NOT WORKING check the workaround above ~~~~~

`node join-channel.js`

**INSTALL CHAINCODE**

`node install-chaincode.js`

**INSTANTIATE CHAINCODE**

`node instantiate-chaincode.js`

**INVOKE**
`node invoke-transaction.js`

**QUERY**
`node query.js`
