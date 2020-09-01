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

/**
 * Function to get url to set as the action
 * attribute to form, which uploads
 * image to blobstore.
 * @return {Promise<string>} url
 */
function getFormUploadUrl() {
  return new Promise(function(resolve, reject) {
    const URL_TO_HANDLE_FORM_UPLOAD = '/get-blur-areas';
    const FETCH_URL_TO_BLOBSTORE = '/blobstore-upload-url?forwardurl=' +
        URL_TO_HANDLE_FORM_UPLOAD;

    fetch(FETCH_URL_TO_BLOBSTORE)
        .then(async (response) => {
          // if server responded with not 200 status
          if (!response.ok) {
            const errorMessage = await response.text();
            alert(response.status + ' server error : ' + errorMessage);

            reject(new Error(response.status + ' server error'));
            return;
          }

          // otherwise get url
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
function getBlurAreas(image) {
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

    fetch(postUrl, {
      method: 'POST',
      body: formData,
    }).then(
        (response) => {
          (async () => {
            // if server responded with not 200 status
            if (!response.ok) {
              const ERROR_MESSAGE = response.status + ' server error';

              reject(ERROR_MESSAGE);

              // show error
              const errorMessageFromServer = await response.text();
              alert(ERROR_MESSAGE + ' ' + errorMessageFromServer);

              // throw error in order not to go to the next .then() statement
              throw new Error(ERROR_MESSAGE);
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
                      // rectangular is invalid - skip it
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

/**
 * Constructor for rectangle to blur.
 * Takes as parameter rectangle from server - array with 4 points,
 * point is an object with properties 'x' and 'y'.
 * Validates rectangle from server.
 * @param {Array<Object>} rect
 * @param {Image} image
 * @constructor
 */
function Rect(rect, image) {
  if (!Array.isArray(rect)) {
    throw new Error('Not a rectangle');
  }

  // has 4 points
  if (rect.length !== 4) {
    throw new Error('Not a rectangle');
  }

  // points must have x and y properties
  for (const point of rect) {
    if (!point.hasOwnProperty('x') || !point.hasOwnProperty('y')) {
      throw new Error('Not a rectangle');
    }
  }

  // points must not duplicate
  for (let i = 0; i < rect.length; i++) {
    for (let j = 0; j < rect.length; j++) {
      if (i === j) {
        continue;
      }

      if (rect[i].x === rect[j].x && rect[i].y === rect[j].y) {
        throw new Error('Not a rectangle');
      }
    }
  }

  // get leftX, rightX, topY and bottomY
  // as min or max values
  this.leftX = rect[0].x;
  this.topY = rect[0].y;
  let rightX = rect[0].x;
  let bottomY = rect[0].y;

  for (const point of rect) {
    this.leftX = Math.min(this.leftX, point.x);
    this.topY = Math.min(this.topY, point.y);
    rightX = Math.max(rightX, point.x);
    bottomY = Math.max(bottomY, point.y);
  }

  // all point's x and y must equal minimum or maximum of those values.
  // if points do not duplicate, it's 'x' has 2 options - either leftX
  // or rightX, 'y' has 2 options, those options are not equal, and
  // rect object has exactly 4 points,
  // then we are sure, that this is a rectangle, parallel to x and y axes.
  for (const point of rect) {
    if (point.x !== this.leftX && point.x !== rightX) {
      throw new Error('Not a rectangle');
    }
    if (point.y !== this.topY && point.y !== bottomY) {
      throw new Error('Not a rectangle');
    }
  }

  // minimum and maximum of x or y must not equal each other
  if (this.leftX === rightX || this.topY === bottomY) {
    throw new Error('Not a rectangle');
  }

  this.height = bottomY - this.topY + 1;
  this.width = rightX - this.leftX + 1;

  // rect must not have points outside the image
  if (this.leftX < 0 || this.topY < 0) {
    throw new Error('Rect has negative points');
  }
  if (bottomY > image.height || rightX > image.width) {
    throw new Error('Rect is greater than image');
  }
}
