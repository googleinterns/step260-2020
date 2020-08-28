#!/bin/bash

# Deploy the app in a testing environment.
# testingId is random to avoid multiple people deploying same version at the same time.
testingId=$(( RANDOM ))
versionName="testing-$testingId"
mvn package appengine:deploy clean -Dapp.deploy.version=$versionName -Dapp.deploy.promote=False

# Run end-to-end tests.
failUrls=0
successUrls=0
for script in end-to-end-tests/*.sh
do
  if ! $script "http://$versionName-dot.photoblur.ew.r.appspot.com/" -H
  then 
    echo "URL failed: $script" 
    ((failUrls++))
  else
    ((successUrls++))
  fi
done

# Delete the testing app.
gcloud app versions delete $versionName --quiet

# Log results
totalUrls=$((failUrls+successUrls))
echo "URLs: $totalUrls; Success: $successUrls; Failed: $failUrls"

# If all tests were run successfully, deploy the app.
if [ $failUrls -eq 0 ]
then
  # Change version to the one you want to deploy on.
  mvn package appengine:deploy clean -Dapp.deploy.version=1
fi
