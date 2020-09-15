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

// suppress linter error - getBlurAreas function is used from another file
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "getBlurAreas" }] */

'use strict';

/**
 * Function which requests server for a formUploadUrl.
 * FormUploadUrl is the url that we will fetch to
 * upload an image.
 * We need this url, because we use blobstore, and this is
 * how it works: we first upload the blob to some blobstore
 * storage (using url from this function), blobstore does its magic,
 * and then redirects the request to your servlet.
 * In servlet you can access the uploaded image from that
 * blobstore storage and not deal with unattractive real files.
 * @return {Promise<string>} url
 */
function getFormUploadUrl() {
  return new Promise(function(resolve, reject) {
    const URL_TO_HANDLE_FORM_UPLOAD = '/get-blur-areas';
    const FETCH_URL_TO_BLOBSTORE = '/blobstore-upload-url?forwardurl=' +
        URL_TO_HANDLE_FORM_UPLOAD;

    fetch(FETCH_URL_TO_BLOBSTORE)
        .then(async (response) => {
          if (!response.ok) {
            const errorMessage = await response.text();
            const errorText = response.status + ' server error';

            alert(errorText + ' : ' + errorMessage);

            reject(new Error(errorText));
            return;
          }

          const url = await response.text();
          resolve(url);
        })
        .catch((error) => {
          alert('Unknown error while uploading image.' +
              '\nPlease try again after some time.');
          reject(error);
        });
  });
}

/**
 * Function to send image to server and get response
 * with areas to blur.
 * @param {File} image
 * @return {Promise<Array<Rect>>} blurAreas
 */
function getBlurAreas(image, faceBlur, plateBlur, logoBlur) {
  return new Promise(async function(resolve, reject) {
    // get new blobstore upload url.
    const postUrl = await getFormUploadUrl().catch((error) => {
      reject(error);
    });
    // if there was an error while getting form upload url.
    if (postUrl === undefined) {
      return;
    }

    // create form
    const formData = new FormData();
    formData.append('image', image);
    if (faceBlur) {
      formData.append('face-blur', 'on');
    }
    if (plateBlur) {
      formData.append('plate-blur', 'on');
    }
    if (logoBlur) {
      formData.append('logo-blur', 'on');
    }

    fetch(postUrl, {
      method: 'POST',
      body: formData,
    }).then(
        (response) => {
          (async () => {
            if (!response.ok) {
              const errorMessage = await response.text();
              const errorText = response.status + ' server error';

              alert(errorText + ' : ' + errorMessage);

              reject(new Error(errorText));

              // throw error in order not to go to the next .then() statement
              throw new Error(errorText);
            }

            return response.json();
          })().then(
              (jsonBlurAreas) => {
                if (!Array.isArray(jsonBlurAreas)) {
                  reject(new Error('Broken json'));
                  return;
                }

                // create image to check that all the rectangles
                // are no greater than the image
                const imageObject = new Image();
                const imageUrl = URL.createObjectURL(image);

                imageObject.onload = function() {
                  const blurAreas = [];

                  for (const jsonRect of jsonBlurAreas) {
                    let rect;
                    try {
                      rect = new Rect(jsonRect, imageObject);
                    } catch (error) {
                      // rectangle is invalid - skip it
                      console.log('Invalid rectangle : ' + error.message,
                          jsonRect);
                      continue;
                    }

                    blurAreas.push(rect);
                  }

                  if (blurAreas.length === 0) {
                    alert('We did not recognize any areas to blur :(');
                  }

                  resolve(blurAreas);
                };

                imageObject.src = imageUrl;
              },

              (error) => {
                if (error.message !== response.status + ' server error') {
                  alert('Unknown error while parsing results.' +
                      '\nPlease reload the page and try again ' +
                      'after some time.');
                  reject(error);
                }
              },
          );
        },

        (error) => {
          alert('Unknown error while uploading image.' +
              '\nPlease reload the page and try again after some time.');
          reject(error);
        },
    );
  });
}
