// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Show the user elements depending on their login status.
  showUserElements();
  await loadContent();
});

/**
 * Function that displays the photos on the page.
 * If the user is logged in, displays the photos with delete buttons attached.
 * Else displays a login link.
 */
async function loadContent() {
  const contentDiv = document.getElementById('photos');
  const currentUser = await getCurrentUser();

  // If the user is not logged in show a message instead of the photos.
  if (!currentUser.loggedIn) {
    contentDiv.innerHTML = `You need to <a ` +
        `href=${currentUser.loginURL}>login</a> to view your history.`;
    return;
  }

  updateUsedSpace(currentUser);

  // Display the photos.
  const photosResponse = await fetch('/photos');
  const photos = await photosResponse.json();

  if (photos.length == 0) {
    contentDiv.innerHTML =
        'You didn\'t upload any photo using this account yet.';
    return;
  }

  for (const photo of photos) {
    displayPhoto(photo);
  }
}

/**
 * Function that displays a photo on the page.
 * @param {Image} photo
 */
async function displayPhoto(photo) {
  const contentDiv = document.getElementById('photos');

  // This will contain both the image and the delete button.
  const container = document.createElement('span');
  container.classList.add('photo-container');

  // Load the photo.
  const blurredImage = (await loadBlurredPhoto(photo)).object;
  blurredImage.classList.add('photo');

  // Add the image to our container.
  container.appendChild(blurredImage);

  // Create the delete button and add it to the container.
  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = 'DELETE';
  deleteButton.classList.add('photo-delete');
  deleteButton.onclick = () => {
    // Make the button inactive so the user can't click it multiple times.
    deleteButton.disable = true;

    // Delete the photo from server.
    fetch(`/photos?photo-id=${photo.id}`, {
      method: 'DELETE',
    }).then(async (response) => {
      if (response.ok) {
        // Delete the photo from page.
        contentDiv.removeChild(container);

        // Reload user to update usedSpace.
        const currentUser = await getCurrentUser();

        updateUsedSpace(currentUser);
      } else {
        const errorMessage = await response.text();
        const errorText = response.status + ' server error';

        alert(errorText + ' : ' + errorMessage);

        reject(new Error(errorText));
        return;
      }
    });
  };
  container.appendChild(deleteButton);

  // Add the container to the page.
  contentDiv.appendChild(container);
}

/**
 * Function to display the space used by the user.
 * @param {User} currentUser
 */
function updateUsedSpace(currentUser) {
  const usedSpace = bytesToMegabytes(currentUser.usedSpace);
  const maximumSpace = bytesToMegabytes(currentUser.USER_STORAGE_LIMIT);
  document.getElementById('used-space').innerHTML =
      `Used space: ${usedSpace} / ${maximumSpace} MB`;
}

/**
 * Function that converts bytes to megabytes with 2 decimals.
 * @param {Number} bytes
 * @return {Number}
 */
function bytesToMegabytes(bytes) {
  return Math.ceil(bytes / 1024 / 1024 * 100) / 100;
}
