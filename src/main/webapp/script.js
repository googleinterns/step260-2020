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
 * Function which is called when page loads.
 * Add event listener to image upload button.
 * Add canvases to the page, put sample image to them.
 */
document.addEventListener('DOMContentLoaded', () => {
  const SAMPLE_IMAGE_URL = 'images/hadgehog.jpg';
  const CANVAS_WIDTH = 300;

  const uploadButton = document.getElementById('upload-image');
  uploadButton.addEventListener('change', handleImageUpload);

  const imagesContainer = document.getElementById('images-container');

  // put canvases into image container on html page.
  const inputCanvas = createCanvasForId('input-canvas');
  inputCanvas.setAttribute('width', CANVAS_WIDTH);
  imagesContainer.append(inputCanvas);

  const outputCanvas = createCanvasForId('output-canvas');
  outputCanvas.setAttribute('width', CANVAS_WIDTH);
  imagesContainer.append(outputCanvas);

  // add sample image on page - original and blurred one.
  putImageOnPage(SAMPLE_IMAGE_URL);
});

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(() => {
    // if image is valid - put it on page
    const imageUrl = URL.createObjectURL(event.target.files[0]);
    putImageOnPage(imageUrl);
  }).catch((error) => {
    // if image is not valid - display error message
    alert(error.message);
  });
}

/**
 * Function to validate the uploaded image.
 * If valid - returns nothing, if not - throws error.
 * @throws {Error} validation errors
 */
async function validateImageUpload() {
  // get FileList with all the files from input element.
  const files = document.getElementById('upload-image').files;

  // check if no files were uploaded.
  if (files.length === 0) {
    throw new Error('Nothing is uploaded');
  }

  // get first (and the only) file from FileList.
  const file = files[0];

  // check whether file is jpeg or png.
  const extension = await getExtensionIfSupported(file);

  // check file size.
  if (extension === 'png' && file.size > 8 * 1024 * 1024) {
    throw new Error('Uploaded png file size can not exceed 8MB');
  }

  if (extension === 'jpeg' && file.size > 2 * 1024 * 1024) {
    throw new Error('Uploaded jpeg file size can not exceed 2MB');
  }

  // File height or width can not be more than 1920px.
  await validateImageDimensions(file);
}

/**
 * Function to get file extension if it is png or jpeg
 * and throw error otherwise
 * @param {File} file
 * @return {Promise}
 */
function getExtensionIfSupported(file) {
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
        resolve('png');
      }

      const JPEG_HEADERS = ['ffd8ffe0', 'ffd8ffe1',
        'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'];
      if (JPEG_HEADERS.includes(header)) {
        resolve('jpeg');
      }

      reject(new Error(
          'Invalid file extension. Only jpeg and png images can be uploaded'));
    };

    // read first 4 bytes from file
    fileReader.readAsArrayBuffer(file.slice(0, 4));
  });
}

/**
 * Function to make sure the file height and width are <= 1920px.
 * Promise returns error if this is not true and
 * nothing otherwise.
 * @param {File} imageFile
 * @return {Promise}
 */
function validateImageDimensions(imageFile) {
  return new Promise(function(resolve, reject) {
    // construct image object from the file
    const imageObject = new Image();
    const imageUrl = URL.createObjectURL(imageFile);

    imageObject.onload = function() {
      if (imageObject.width > 1920) {
        reject(new Error(
            'Uploaded file width are too big. Maximum width can be 1920px'));
        return;
      }

      if (imageObject.height > 1920) {
        reject(new Error(
            'Uploaded file height are too big. Maximum height can be 1920px'));
      }

      resolve();
    };

    imageObject.src = imageUrl;
  });
}

/**
 * Creates canvas with specified id.
 * @param {string} id
 * @return {HTMLCanvasElement} canvas DOM element
 */
function createCanvasForId(id) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('id', id);

  return canvas;
}

/**
 * Function to draw image on input canvas.
 * @param {string} imageUrl
 */
async function putImageOnPage(imageUrl) {
  // create Image object from url to put it on canvas.
  const imageObj = new Image();
  imageObj.src = imageUrl;

  // need to wait until image loads to put it anywhere.
  imageObj.onload = () => {
    const inputCanvas = document.getElementById('input-canvas');
    drawImageOnCanvas(imageObj, inputCanvas);
  };
}

/**
 * Function to draw image on canvas.
 * Width of canvas should be constant, height adjusts for
 * the image proportions.
 * @param {Image} image
 * @param {HTMLCanvasElement} canvas
 */
function drawImageOnCanvas(image, canvas) {
  const ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // resize canvas height to fit new image
  canvas.height = image.height * canvas.width / image.width;

  // draw new image on it, scaling the image to fit in canvas
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}
