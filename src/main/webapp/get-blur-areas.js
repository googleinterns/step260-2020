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
    throw new Error('Object passed here is not an Array. ' +
        'It must be an Array of points');
  }

  // has 4 points
  if (rect.length !== 4) {
    throw new Error(`Rectangle object must contain exactly 4 corner ` +
        `points. This rectangle has ${rect.length} points.`);
  }

  // points must have x and y properties
  for (const point of rect) {
    if (!point.hasOwnProperty('x')) {
      throw new Error(`Point ${JSON.stringify(point)} ` +
      `does not have "x" property`);
    }
    if (!point.hasOwnProperty('y')) {
      throw new Error(`Point ${JSON.stringify(point)} ` +
          `does not have "y" property`);
    }
  }

  // points must not duplicate
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < i; j++) {
      if (rect[i].x === rect[j].x && rect[i].y === rect[j].y) {
        throw new Error(`Duplicate points ${i} : (${rect[i].x}, ${rect[i].y})` +
            ` and ${j} : (${rect[j].x}, ${rect[j].y})`);
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

  this.height = bottomY - this.topY + 1;
  this.width = rightX - this.leftX + 1;

  // all point's x and y must equal minimum or maximum of those values.
  // if points do not duplicate, it's 'x' has 2 options - either leftX
  // or rightX, 'y' has 2 options, those options are not equal, and
  // rect object has exactly 4 points,
  // then we are sure, that this is a rectangle, parallel to x and y axes.
  for (const point of rect) {
    if (point.x !== this.leftX && point.x !== rightX) {
      throw new Error(`Point's (${point.x}, ${point.y}) "x" property equals ` +
          `${point.x} which does not equal this rect's` +
          `minimum (${this.leftX}) or maximum (${rightX}) "x" property => ` +
          `this is not a rectangle with sides parallel to x and y axes`);
    }
    if (point.y !== this.topY && point.y !== bottomY) {
      throw new Error(`Point's (${point.x}, ${point.y}) "y" property equals ` +
          `${point.y} which does not equal this rect's` +
          `minimum (${this.topY}) or maximum (${bottomY}) "y" property => ` +
          `this is not a rectangle with sides parallel to x and y axes`);
    }
  }

  // minimum and maximum of x or y must not equal each other
  if (this.leftX === rightX) {
    throw new Error('All points have the same "x" coordinate');
  }
  if (this.topY === bottomY) {
    throw new Error('All points have the same "y" coordinate');
  }

  // rect must not have points outside the image
  if (this.leftX < 0) {
    throw new Error(`Has negative x point: ${this.leftX}`);
  }
  if (this.topY < 0) {
    throw new Error(`Has negative y point: ${this.topY}`);
  }
  if (rightX > image.width) {
    throw new Error(`Has x point which is greater than ` +
        `image width: ${rightX}`);
  }
  if (bottomY > image.height) {
    throw new Error(`Has y point which is greater than ` +
        `image height: ${bottomY}`);
  }
}
