#!/bin/bash

function dkcl(){
        CONTAINER_IDS=$(docker ps -aq)
	echo
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
                echo "========== No containers available for deletion =========="
        else
                docker rm -f $CONTAINER_IDS
        fi
	echo
}

function dkrm(){
        DOCKER_IMAGE_IDS=$(docker images | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $3}')
	echo
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
		echo "========== No images available for deletion ==========="
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
	echo
}

function restartNetwork() {
	echo
	cd artifacts
	docker-compose down
	dkcl
	dkrm
	rm -rf $HOME/.hfc-key-store /tmp/fabric-client-kvs*
	docker-compose up -d
	cd -
	echo
}

function installNodeModules() {
	echo
	if [ -d node_modules ]; then
		echo "============== node modules installed already ============="
	else
		echo "============== Installing node modules ============="
		npm install
	fi
	echo
}

function execApp(){
	echo "============== Start node app execution =============="
	echo ""
	node app/create-channel.js

	node app/join-channel.js

	node app/install-chaincode.js

	node app/instantiate-chaincode.js

	node app/invoke-transaction.js

	node app/query.js
	echo ""
	echo "============== App execution completed ============="
	echo
}

restartNetwork

installNodeModules

execApp
