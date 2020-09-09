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
  putSampleImagesOnPage();
});

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(async () => {
    // if image is valid - put it on page (original and blurred one).
    putImageOnPageAndBlur(event.target.files[0]);
  }).catch((error) => {
    // if image is not valid - display error message
    alert(error.message);
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
 * Function to blur image and put on page
 * original and blurred images
 * @param {File} imageFile
 */
async function putImageOnPageAndBlur(imageFile) {
  const imageUrl = URL.createObjectURL(imageFile);

  // create Image object from url to put it on canvas.
  const imageObj = new Image();
  imageObj.src = imageUrl;

  // need to wait until image loads to put it anywhere.
  imageObj.onload = async () => {
    const inputCanvas = document.getElementById('input-canvas');
    drawImageOnCanvas(imageObj, inputCanvas);

    const blurAreas = await getBlurAreas(imageFile);

    const blurredImage = getImageWithBlurredAreas(blurAreas, imageObj);

    const outputCanvas = document.getElementById('output-canvas');
    drawImageOnCanvas(blurredImage, outputCanvas);
  };
}

/**
 * Function to draw sample image (blurred and not blurred)
 * on input and output canvases.
 */
async function putSampleImagesOnPage() {
  const SAMPLE_IMAGE_URL = 'images/hadgehog.jpg';
  const BLURRED_SAMPLE_IMAGE_URL = 'images/blurred-hadgehog.png';

  /**
   * @param {string} imageUrl
   * @param {string} canvasId
   */
  const putImageOnCanvas = (imageUrl, canvasId) => {
    // create Image object from url to put it on canvas.
    const imageObj = new Image();
    imageObj.src = imageUrl;

    // need to wait until image loads to put it anywhere.
    imageObj.onload = () => {
      const canvas = document.getElementById(canvasId);
      drawImageOnCanvas(imageObj, canvas);
    };
  };

  putImageOnCanvas(SAMPLE_IMAGE_URL, 'input-canvas');
  putImageOnCanvas(BLURRED_SAMPLE_IMAGE_URL, 'output-canvas');
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
