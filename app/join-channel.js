/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var grpc = require('grpc');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var EventHub = require('fabric-client/lib/EventHub.js');

var adminUser = null;
var tx_id = null;
var nonce = null;

var config = require('./config.json')
var helper = require('./helper.js');
var logger = helper.getLogger('Join-Channel');

hfc.addConfigFile(path.join(__dirname, 'network-config.json'));
var ORGS = hfc.getConfigSetting('network-config');

var allEventhubs = [];

var _commonProto = grpc.load(path.join(__dirname, '../node_modules/fabric-client/lib/protos/common/common.proto')).common;
var isSuccess = null;
//
//Attempt to send a request to the orderer with the sendCreateChain method
//
	logger.debug('\n============ Join Channel ============\n')
	// on process exit, always disconnect the event hub
	process.on('exit', function() {
		if (isSuccess){
			logger.debug('\n============ Join Channel is SUCCESS ============\n')
		}else{
			logger.debug('\n!!!!!!!! ERROR: Join Channel FAILED !!!!!!!!\n')
		}
		for(var key in allEventhubs) {
			var eventhub = allEventhubs[key];
			if (eventhub && eventhub.isconnected()) {
				//logger.debug('Disconnecting the event hub');
				eventhub.disconnect();
			}
		}
	});

	joinChannel(config.orgsList[0])
	.then(() => {
		logger.info(util.format('Successfully joined peers in organization "%s" to the channel', ORGS[config.orgsList[0]].name));
		return joinChannel(config.orgsList[1]);
	}, (err) => {
		logger.error(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS[config.orgsList[0]].name, err.stack ? err.stack : err));
		process.exit();
	})
	.then(() => {
		logger.info(util.format('Successfully joined peers in organization "%s" to the channel', ORGS[config.orgsList[1]].name));
		isSuccess = true;
		process.exit();
	}, (err) => {
		logger.error(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS[config.orgsList[1]].name), err.stack ? err.stack : err);
		process.exit();
	})
	.catch(function(err) {
		logger.error('Failed request. ' + err);
		process.exit();
	});

function joinChannel(org) {
	logger.info(util.format('Calling peers in organization "%s" to join the channel', org));

	//
	// Create and configure the chain
	//
	var client = new hfc();
	var chain = client.newChain(config.channelName);

	var orgName = ORGS[org].name;
	var targets = [], eventhubs = [];

	chain.addOrderer(
		helper.getOrderer()
	);

	for (let key in ORGS[org]) {
		if (ORGS[org].hasOwnProperty(key)) {
			if (key.indexOf('peer') === 0) {
				data = fs.readFileSync(path.join(__dirname, ORGS[org][key]['tls_cacerts']));
				targets.push(
					new Peer(
						ORGS[org][key].requests,
						{
							pem: Buffer.from(data).toString(),
							'ssl-target-name-override': ORGS[org][key]['server-hostname']
						}
					)
				);

				let eh = new EventHub();
				eh.setPeerAddr(
					ORGS[org][key].events,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': ORGS[org][key]['server-hostname']
					}
				);
				eh.connect();
				eventhubs.push(eh);
				allEventhubs.push(eh);
			}
		}
	}

	return hfc.newDefaultKeyValueStore({
        path: helper.getKeyStoreForOrg(orgName)
	}).then((store) => {
		client.setStateStore(store);
        return helper.getSubmitter(client, org);
	})
	.then((admin) => {
		logger.info('Successfully enrolled user \'admin\'');
		adminUser = admin;

		nonce = utils.getNonce();
		tx_id = chain.buildTransactionID(nonce, adminUser);
		var request = {
			targets : targets,
			txId : 	tx_id,
			nonce : nonce
		};

		var eventPromises = [];
		eventhubs.forEach((eh) => {
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(reject, parseInt(config.eventWaitTime));

				eh.registerBlockEvent((block) => {
					clearTimeout(handle);

					// in real-world situations, a peer may have more than one channels so
					// we must check that this block came from the channel we asked the peer to join
					if(block.data.data.length === 1) {
						// Config block must only contain one transaction
						var envelope = _commonProto.Envelope.decode(block.data.data[0]);
						var payload = _commonProto.Payload.decode(envelope.payload);
						var channel_header = _commonProto.ChannelHeader.decode(payload.header.channel_header);

						if (channel_header.channel_id === config.channelName) {
							logger.info('The channel \''+config.channelName+'\' has been successfully joined on peer '+ eh.ep._endpoint.addr);
							resolve();
						}
					}
				});
			});

			eventPromises.push(txPromise);
		});

		let sendPromise = chain.joinChannel(request);
		return Promise.all([sendPromise].concat(eventPromises));
	}, (err) => {
		logger.error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
	})
	.then((results) => {
		logger.debug(util.format('Join Channel R E S P O N S E : %j', results));

		if(results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
			logger.info(util.format('Successfully joined peers in organization %s to join the channel', orgName));
		} else {
			logger.error(' Failed to join channel');
			throw new Error('Failed to join channel');
		}
	}, (err) => {
		logger.error('Failed to join channel due to error: ' + err.stack ? err.stack : err);
		process.exit();
	});
}
