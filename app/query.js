/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var EventHub = require('fabric-client/lib/EventHub.js');

var config = require('./config.json')
var helper = require('./helper.js');
var logger = helper.getLogger('invoke-chaincode');

hfc.addConfigFile(path.join(__dirname, 'network-config.json'));
var ORGS = hfc.getConfigSetting('network-config');

var tx_id = null;
var nonce = null;
var adminUser = null;

//test('\n\n***** End-to-end flow: query chaincode *****', (t) => {
	// this is a transaction, will just use org1's identity to
	// submit the request. intentionally we are using a different org
	// than the one that submitted the "move" transaction, although either org
	// should work properly
	var org = config.orgsList[0]; // org1
	var client = new hfc();
	var chain = client.newChain(config.channelName);

	chain.addOrderer(
		helper.getOrderer()
	);
	var orgName = ORGS[org].name;

	var targets = [];
	// set up the chain to use each org's 'peer1' for
	// both requests and events
	for (let key in ORGS) {
		if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
			let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
			let peer = new Peer(
				ORGS[key].peer1.requests,
				{
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': ORGS[key].peer1['server-hostname']
				});
			chain.addPeer(peer);
		}
	}

	return hfc.newDefaultKeyValueStore({
    path: helper.getKeyStoreForOrg(orgName)
	}).then((store) => {

		client.setStateStore(store);
    return helper.getSubmitter(client, org);

	}).then((admin) => {
		adminUser = admin;

		nonce = utils.getNonce();
		tx_id = chain.buildTransactionID(nonce, adminUser);

		// send query
		var request = {
			chaincodeId: config.chaincodeId,
			chaincodeVersion: config.chaincodeVersion,
			chainId: config.channelName,
			txId: tx_id,
			nonce: nonce,
			fcn: config.queryRequest.functionName,
			args: helper.getArgs(config.queryRequest.args)
		};
		return chain.queryByChaincode(request);
	},
	(err) => {
		logger.info('Failed to get submitter \'admin\'');
		logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err );
	}).then((response_payloads) => {
		if (response_payloads) {
			for(let i = 0; i < response_payloads.length; i++) {
				logger.info('User b now has '+response_payloads[i].toString('utf8')+' after the move')
			}
		} else {
			logger.error('response_payloads is null');
		}
	},
	(err) => {
		logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);
	}).catch((err) => {
		logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
	});
