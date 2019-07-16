#!/bin/bash

dbName=$1
image=$2

# Create database
docker run -v "$PWD/db/:/app/db" ${image} npm run setup

# Run integration tests
docker run -v "$PWD/db/:/app/db"  -v "$PWD/.env.json:/app/.env.json" -v "$PWD/log:/app/log" ${image} npm run test
test_result=$?
echo test_result:$test_result

# Drop database
docker run -v "$PWD/db/:/app/db" ${image} rm db/wallet.db

if [ $test_result != 0 ] ; then 
  echo 'Tests failed!'
  exit $test_result; 
fi;

