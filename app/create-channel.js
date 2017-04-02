/**
 * Copyright 2017 IBM All Rights Reserved.
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

var hfc = require('fabric-client');
var util = require('util');
var fs = require('fs');
var path = require('path');

var config = require('../config.json')
var helper = require('./helper.js');
var logger = helper.getLogger('Create-Channel');

createChannel();

//
//Attempt to send a request to the orderer with the sendCreateChain method
//
function createChannel(){
  logger.debug('\n====== Creating Channel \''+config.channelName+'\' ======\n')
	//
	// Create and configure the chain
	//
	var client = new hfc();
	var chain = client.newChain(config.channelName);

	chain.addOrderer(
		helper.getOrderer()
	);

	// Acting as a client in org1 when creating the channel
	var org = helper.getOrgName(config.orgsList[0]);

	return hfc.newDefaultKeyValueStore({
		path: helper.getKeyStoreForOrg(org)
	}).then((store) => {
		client.setStateStore(store);
		return helper.getSubmitter(client, config.orgsList[0]);
	})
	.then((admin) => {
		logger.debug('Successfully enrolled user \'admin\'');
		// readin the envelope to send to the orderer
		//data = fs.readFileSync(config.channelConfigurationTxn);
		var data = fs.readFileSync(path.join(__dirname, config.channelConfigurationTxn))
		var request = {
			envelope : data
		};
		// send to orderer
		return chain.createChannel(request);
	}, (err) => {
		logger.error('Failed to enroll user \'admin\'. ' + err);
	})
	.then((response) => {
		logger.debug(' response ::%j',response);

		if (response && response.status === 'SUCCESS') {
			logger.debug('Successfully created the channel.');
			return sleep(5000);
		} else {
			logger.error('Failed to create the channel. ');
			logger.debug('\n!!!!!!!!! Failed to create the channel \''+config.channelName+'\' !!!!!!!!!\n\n')
		}
	}, (err) => {
		logger.error('Failed to initialize the channel: ' + err.stack ? err.stack : err);
	})
	.then((nothing) => {
		logger.debug('Successfully waited to make sure channel \''+config.channelName+'\' was created.');
		logger.debug('\n====== Channel creation \''+config.channelName+'\' completed ======\n\n')
	}, (err) => {
		logger.error('Failed to sleep due to error: ' + err.stack ? err.stack : err);
	});
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
