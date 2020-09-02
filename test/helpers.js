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

/* eslint no-unused-vars:
["error", { "varsIgnorePattern": "getFileObject|getImageFromPath" }] */

'use strict';

/**
 * Helper function to get Blob from path or url.
 * Promise resolves with that blob.
 * @param {string} url
 * @return {Promise}
 */
async function getFileBlob(url) {
  return new Promise(function(resolve) {
    // create request for that blob
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';

    // wait until request loads and return blob
    xhr.addEventListener('load', function() {
      resolve(xhr.response);
    });

    xhr.send();
  });
}

/**
 * Helper function to get File object from
 * path or url.
 * Promise resolves with that File.
 * @param {string} filePathOrUrl
 * @return {Promise}
 */
async function getFileObject(filePathOrUrl) {
  const blob = await getFileBlob(filePathOrUrl);
  blob.lastModifiedDate = new Date();

  return new File([blob], 'my-file');
}

/**
 * Helper function to get image object from
 * image represented by path (e.g. 'images/image.jpg').
 * @param {string} path
 * @return {Promise<Image>} image
 */
function getImageFromPath(path) {
  return new Promise(function(resolve) {
    const image = new Image();
    image.src = path;

    image.onload = function() {
      resolve(image);
    };
  });
}
