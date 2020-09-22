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

// suppress linter error -
// validateImageUpload function is used from another file.
/* eslint no-unused-vars:
["error", { "varsIgnorePattern": "validateImageUpload" }] */

'use strict';

/**
 * Function to validate the uploaded image.
 * If valid - returns nothing, if not - throws error.
 * @throws {Error} validation errors
 */
async function validateImageUpload() {
  // max width and height in px.
  const MAX_IMAGE_WIDTH = 1920;
  const MAX_IMAGE_HEIGHT = 1080;

  // size limits for each supported type in Mb.
  // calculated as MAX_IMAGE_RESOLUTION * AVERAGE_SIZE_OF_IMAGE_OF_THIS_TYPE
  // and converted to Mb.
  const MAX_SIZES = {
    'image/png': Math.round(MAX_IMAGE_HEIGHT * MAX_IMAGE_WIDTH * 4 /
        1024 / 1024),
    'image/jpeg': Math.round(MAX_IMAGE_HEIGHT * MAX_IMAGE_WIDTH * 8.25 /
        8 / 1024 / 1024),
  };

  // get FileList with all the files from input element.
  const files = document.getElementById('upload-image').files;

  // check if no files were uploaded.
  if (files.length === 0) {
    throw new Error('Nothing is uploaded');
  }

  // get first (and the only) file from FileList.
  const file = files[0];

  // check whether file is jpeg or png.
  const fileType = await getImageTypeOrError(file);

  // check file size.
  validateImageSize(file, fileType, MAX_SIZES);

  // Image resolution can not be more than MAX_IMAGE_WIDTH x MAX_IMAGE_HEIGHT.
  await validateImageResolution(file, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT);
}

/**
 * Function to make sure the image is not too big.
 * Assume the image type is already validated.
 * @param {File} image
 * @param {string} imageType Can be 'png' or 'jpeg' only.
 * @param {Object} maxSizes Object with limits for image sizes in Mb.
 */
function validateImageSize(image, imageType, maxSizes) {
  if (image.size > maxSizes[imageType] * 1024 * 1024) {
    throw new Error(
        `File size should not exceed ${maxSizes[imageType]}MB for ` +
        `${imageType} images.The size of an uploaded ${imageType} image is ` +
        Math.ceil(image.size / 1024 / 1024) + 'MB');
  }
}

/**
 * Function to get file type if it is png or jpeg
 * and throw error otherwise
 * @param {File} file
 * @return {Promise}
 */
function getImageTypeOrError(file) {
  return new Promise(function(resolve, reject) {
    const fileReader = new FileReader();

    fileReader.onloadend = function(e) {
      // get first 4 bytes from file - they contain information
      // about the extension.
      const bytes = new Uint8Array(e.target.result);

      // convert those bytes to string
      let header = '';
      for (let i = 0; i < bytes.length; i++) {
        header += bytes[i].toString(16);
      }

      const PNG_HEADERS = ['89504e47'];
      if (PNG_HEADERS.includes(header)) {
        resolve('image/png');
      }

      const JPEG_HEADERS = ['ffd8ffe0', 'ffd8ffe1',
        'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'];
      if (JPEG_HEADERS.includes(header)) {
        resolve('image/jpeg');
      }

      reject(new Error(
          'Invalid file type. Only jpeg and png images can be uploaded'));
    };

    // read first 4 bytes from file
    fileReader.readAsArrayBuffer(file.slice(0, 4));
  });
}

/**
 * Function to make sure the image resolution is no
 * more than mxWidth x mxHeight
 * Promise returns error if this is not true and
 * nothing otherwise.
 * @param {File} imageFile
 * @param {Number} mxWidth
 * @param {Number} mxHeight
 * @return {Promise}
 */
function validateImageResolution(imageFile, mxWidth, mxHeight) {
  return new Promise(function(resolve, reject) {
    // construct image object from the file
    const imageObject = new Image();
    const imageUrl = URL.createObjectURL(imageFile);

    imageObject.onload = function() {
      if (imageObject.width * imageObject.height >
          mxWidth * mxHeight) {
        reject(new Error(
            'The image resolution can not exceed ' + mxWidth +
            'x' + mxHeight + 'px. ' +
            'The uploaded image resolution is ' +
            imageObject.width + 'x' + imageObject.height + 'px'));
        return;
      }

      resolve();
    };

    imageObject.src = imageUrl;
  });
}
