#!/bin/bash

failTests=0
successTests=0

# Makes a POST request with an image as parameter and compares the response with a file's content.
# First parameter is the host to make the request to.
# Second parameter is image's name.
# Third parameter is the name of the file containing the expected output.
check_image() {
  if [ $# -ne 3 ]
  then
    echo "The function check_image must receive 3 parameters!"
    return 1
  fi
  echo "get-blur-areas: Running test for image: $2"

  # Get the blobstore upload url.
  uploadUrl=$(curl "$1blobstore-upload-url?forwardurl=/get-blur-areas")

  # POST the image.
  response=$(curl -X POST -H "Content-Type: multipart/form-data" -F "image=@end-to-end-tests/files/$2" "$uploadUrl")

  # Compare the response we got with the expected one.
  # If they are different, fail the test.
  expected=$(cat end-to-end-tests/expected/get-blur-areas/$3)
  if [ "$response" == "$expected" ]
  then
    ((successTests++))
  else
    echo "get-blur-areas: Test failed at image: $2"
    echo "Returned: $response"
    echo "Should return: $expected"
    ((failTests++))
  fi
}

# Parameter $1 is the host name where to make the requests to, received by the script.
check_image $1 "MultiplePeople.jpg" "MultiplePeople.txt"
check_image $1 "OnePerson.png" "OnePerson.txt"
check_image $1 "GithubBranching.png" "GithubBranching.txt"
check_image $1 "RandomText.txt" "RandomText.txt"
check_image $1 "EmptyFile.txt" "EmptyFile.txt"

totalTests=$((failTests+successTests))
echo "Tests ran: $totalTests; Success: $successTests; Failed: $failTests"
if [ $failTests -gt 0 ]
then
  exit 1
fi